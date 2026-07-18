import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Search, Scissors, User, ChevronRight, X, ArrowLeft, BadgeCheck, CalendarDays, CalendarCheck, MessageCircle, Navigation, Layers, Share2 } from 'lucide-react';
import { UserProfile, useFirebase, Appointment, ChatMessage, Review, hashPostId, getItemPhotos } from '../hooks/useFirebase';
import { STYLE_POSTS, avatarFor, PORTFOLIO_PHOTOS, SALON_COVER_PHOTO, mockBarberFromPost, CITY_COORDS, distanceKm } from '../data/mockBarberFeed';
import BookingModal from './BookingModal';
import SearchBar from './SearchBar';
import CategoryRail from './CategoryRail';
import PhotoGalleryLightbox, { LightboxPhoto } from './PhotoGalleryLightbox';
import SkeletonCard from './SkeletonCard';
import MobilePostCard from './MobilePostCard';
import DesktopPostCard from './DesktopPostCard';
import ProfileRow from './ProfileRow';
import Avatar from './Avatar';
import ChatListTab from './ChatListTab';
import MyBookingsSection from './MyBookingsSection';
import { useChatInbox } from '../hooks/useChatInbox';
import { formatRelativeTime } from '../utils/relativeTime';

// A single bookable "look": either a real barber's own uploaded realization, or one
// of the mock style-feed posts. Unified so the client search shows both the same way.
interface FeedEntry {
  barber: UserProfile;
  item: { url: string; name: string; price: number; category?: string; createdAt?: number };
  isMock: boolean;
  // False for a real pro with no uploaded portfolio photo yet — their profile-photo
  // stand-in makes them findable by category search, but it's not a real "post" and
  // must not show up in the Publications feed (only in the Profils list).
  hasRealPhoto: boolean;
  rating: number;
  city: string;
  availableDays: number[];
}

interface AppMVPProps {
  onLogout: () => void;
  onLogin: () => void;
  theme: 'dark' | 'light';
  profile: UserProfile | null;
  onLogoutFirebase: () => void;
  clientLocation?: { lat: number; lng: number } | null;
  appointments: Appointment[];
  onUpdateStatus: (id: string, status: Appointment['status']) => Promise<void>;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onAddReview: (review: { clientId: string; barberId: string; appointmentId: string; rating: number; comment: string }) => Promise<void>;
  onClientBook: (barberId: string, serviceId: string, serviceName: string, dateTime: Date, totalPrice: number, proposedPrice?: number, clientNotes?: string) => Promise<void>;
  onGuestRegisterAndBook: (
    registerData: { firstName: string; email: string; password: string },
    barberId: string,
    serviceId: string,
    serviceName: string,
    dateTime: Date,
    totalPrice: number,
    clientNotes?: string
  ) => Promise<void>;
  initialCategory?: string | null;
  onGetBarberReviews: (barberId: string) => Promise<Review[]>;
  onIncrementProfileView: (barberId: string) => Promise<void>;
  onFetchLikeState: (postId: string) => Promise<{ count: number; liked: boolean }>;
  onToggleLike: (postId: string) => Promise<{ count: number; liked: boolean } | undefined>;
  barbersLoading: boolean;
  sharedPostId?: string | null;
  sharedBarberId?: string | null;
  subscribeToLastChatMessage: (appointmentId: string, callback: (message: ChatMessage | null) => void) => () => void;
  subscribeToChatReadReceipt: (appointmentId: string, callback: (lastReadAt: any | null) => void) => () => void;
  markChatAsRead: (appointmentId: string) => Promise<void>;
  subscribeToChatHidden: (appointmentId: string, callback: (hidden: boolean) => void) => () => void;
  hideChatForMe: (appointmentId: string) => Promise<void>;
  onUpdatePhone: (phone: string) => Promise<void>;
  onDeleteAccount: (password: string) => Promise<void>;
}

export default function AppMVP({ onLogout, onLogin, theme, profile, onLogoutFirebase, clientLocation, appointments, onUpdateStatus, onUpdateAppointment, onAddReview, onClientBook, onGuestRegisterAndBook, initialCategory, onGetBarberReviews, onIncrementProfileView, onFetchLikeState, onToggleLike, barbersLoading, sharedPostId, sharedBarberId, subscribeToLastChatMessage, subscribeToChatReadReceipt, markChatAsRead, subscribeToChatHidden, hideChatForMe, onUpdatePhone, onDeleteAccount }: AppMVPProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'bookings' | 'chat'>('search');
  const [chatInitialSelectedId, setChatInitialSelectedId] = useState<string | null>(null);
  const [resultsTab, setResultsTab] = useState<'pourVous' | 'profils'>('pourVous');
  const [selectedEntry, setSelectedEntry] = useState<FeedEntry | null>(null);
  const selectedBarber = selectedEntry?.barber ?? null;
  const [showBooking, setShowBooking] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ photos: LightboxPhoto[]; index: number } | null>(null);
  const openLightbox = (photos: LightboxPhoto[], index: number) => setLightbox({ photos, index });

  // Real average rating for the barber currently being viewed, computed from actual
  // reviews instead of a flat hardcoded number — null while loading or for mock entries.
  const [reviewStats, setReviewStats] = useState<{ avg: number; count: number } | null>(null);
  useEffect(() => {
    if (!selectedBarber || selectedEntry?.isMock) {
      setReviewStats(null);
      return;
    }
    let cancelled = false;
    onGetBarberReviews(selectedBarber.uid).then(reviews => {
      if (cancelled) return;
      setReviewStats(reviews.length > 0
        ? { avg: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length, count: reviews.length }
        : { avg: 0, count: 0 });
    });
    return () => { cancelled = true; };
  }, [selectedBarber, selectedEntry?.isMock, onGetBarberReviews]);

  // Real per-pro "visiteurs" count — bump the barber's own profileViews once per visit
  // to their profile (not for mock/demo entries, which have no real backing account).
  useEffect(() => {
    if (!selectedBarber || selectedEntry?.isMock) return;
    onIncrementProfileView(selectedBarber.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBarber?.uid, selectedEntry?.isMock]);

  // Notification badge on "Mes Réservations" — real count of new counter-proposals from
  // a pro awaiting the client's response, like an unread count.
  const newProposalsCount = useMemo(
    () => appointments.filter(a => a.negotiationStatus === 'barber_countered').length,
    [appointments]
  );

  // The gallery shown in "Réalisations", with each photo's own name/price when known
  // (real portfolio items) so the fullscreen viewer can display it while browsing.
  const realizationPhotos: LightboxPhoto[] = selectedEntry
    ? (selectedEntry.isMock
        ? PORTFOLIO_PHOTOS.map(url => ({ url, name: selectedEntry.item.name, price: selectedEntry.item.price, createdAt: selectedEntry.item.createdAt || selectedBarber?.createdAt }))
        : (selectedBarber?.portfolioItems || []).map(i => ({ url: i.url, photoUrls: getItemPhotos(i), name: i.name, price: i.price, createdAt: i.createdAt || selectedBarber?.createdAt })))
    : [];

  // The list a client picks from when booking: the barber's own prestations menu when
  // they've prepared one, otherwise the single realization the client clicked into.
  const barberServicesForBooking = useMemo(() => {
    if (!selectedBarber) return [];
    if (selectedBarber.services && selectedBarber.services.length > 0) {
      return selectedBarber.services.map(s => ({ ...s, category: '' }));
    }
    if (selectedEntry) {
      return [{ id: 'entry', name: selectedEntry.item.name, price: selectedEntry.item.price, duration: 30, category: selectedEntry.item.category || '' }];
    }
    return [];
  }, [selectedBarber, selectedEntry]);

  const [searchGender, setSearchGender] = useState<'' | 'homme' | 'femme'>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory ?? null);
  const [searchDateTime, setSearchDateTime] = useState('');
  const [searchStyle, setSearchStyle] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const moroccanCities = useMemo(() => Object.keys(CITY_COORDS).sort(), []);

  const { services, barbers, user } = useFirebase();

  // Kept mounted here (not inside the Chat tab itself) so the bottom-nav badge stays
  // live even while the client is on a different tab — see useChatInbox.ts.
  const { conversations: chatConversations, totalUnread: chatTotalUnread } = useChatInbox(
    appointments,
    profile?.uid,
    subscribeToLastChatMessage,
    subscribeToChatReadReceipt,
    subscribeToChatHidden
  );

  // Real distance between the client and a barber's own saved GPS location when the pro
  // has set one (Mon Profil > Localisation) — falls back to a city-level approximation
  // when they haven't, so search results still show a distance either way. Only computed
  // once the client has shared their own location (via "Trouver un coiffeur autour de moi").
  const getDistance = (barber: UserProfile, city: string) => {
    if (!clientLocation) return null;
    if (barber.locationLat !== undefined && barber.locationLng !== undefined) {
      return distanceKm(clientLocation.lat, clientLocation.lng, barber.locationLat, barber.locationLng);
    }
    const coord = CITY_COORDS[city];
    if (!coord) return null;
    return distanceKm(clientLocation.lat, clientLocation.lng, coord.lat, coord.lng);
  };

  // Real barbers who've published their own realizations show up next to the mock
  // style feed — clients should be able to find and book them, same as the barber
  // side's own "Accueil" tab already does for browsing other barbers.
  const feedEntries = useMemo<FeedEntry[]>(() => {
    const real: FeedEntry[] = [];
    barbers.forEach(b => {
      if (b.portfolioItems && b.portfolioItems.length > 0) {
        b.portfolioItems.forEach(item => {
          real.push({
            barber: b,
            item,
            isMock: false,
            hasRealPhoto: true,
            rating: 4.9,
            city: b.city || 'Casablanca',
            availableDays: b.workingDays && b.workingDays.length > 0 ? b.workingDays : [1, 2, 3, 4, 5, 6]
          });
        });
      } else if (b.categories && b.categories.length > 0) {
        // No photos published yet, but the pro has picked categories — make them
        // discoverable by category anyway (search shouldn't require a portfolio),
        // using their profile photo in place of a specific realization. This entry
        // never reaches the Publications feed (hasRealPhoto: false below), so this
        // placeholder value is never actually rendered as a photo — avatar display
        // reads from entry.barber.avatarUrl via entryAvatarUrl() instead.
        const image = b.avatarUrl || b.coverUrl || '';
        const startingPrice = b.services && b.services.length > 0
          ? Math.min(...b.services.map(s => s.price))
          : 0;
        b.categories.forEach(categoryId => {
          real.push({
            barber: b,
            item: { url: image, name: `${b.firstName} ${b.lastName}`.trim(), price: startingPrice, category: categoryId },
            isMock: false,
            hasRealPhoto: false,
            rating: 4.9,
            city: b.city || 'Casablanca',
            availableDays: b.workingDays && b.workingDays.length > 0 ? b.workingDays : [1, 2, 3, 4, 5, 6]
          });
        });
      }
    });
    const mock: FeedEntry[] = STYLE_POSTS.map(post => ({
      barber: mockBarberFromPost(post),
      item: { url: post.photo, name: post.style, price: post.priceFrom, category: post.category, createdAt: post.createdAt },
      isMock: true,
      hasRealPhoto: true,
      rating: post.rating,
      city: post.city,
      availableDays: post.availableDays
    }));
    return [...real, ...mock];
  }, [barbers]);

  const filteredEntries = useMemo(() => {
    const selectedDay = searchDateTime ? new Date(searchDateTime).getDay() : null;
    // Only gender, category, city and the barber's availability on the chosen day actually filter results.
    const results = feedEntries.filter(e => {
      if (searchGender && e.barber.gender !== searchGender) return false;
      if (selectedCategory && (e.item.category || 'cheveux') !== selectedCategory) return false;
      if (searchCity && e.city !== searchCity) return false;
      if (selectedDay !== null && !e.availableDays.includes(selectedDay)) return false;
      return true;
    });
    // The style text doesn't exclude anyone — it just brings barbers who have already
    // done that look to the top, as a recommendation.
    const style = searchStyle.trim().toLowerCase();
    if (!style) return results;
    return [...results].sort((a, b) => {
      const aMatch = a.item.name.toLowerCase().includes(style) ? 0 : 1;
      const bMatch = b.item.name.toLowerCase().includes(style) ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [feedEntries, searchGender, selectedCategory, searchCity, searchDateTime, searchStyle]);

  // Publications only ever show posts with a real photo — a pro who's only picked
  // categories but hasn't uploaded anything yet is findable via the "Profils" tab, not
  // here (their avatar isn't a real "post").
  const postEntries = useMemo(() => filteredEntries.filter(e => e.hasRealPhoto), [filteredEntries]);

  // A stock "face" is only ever appropriate for demo content (isMock) — a real pro with
  // no uploaded avatar gets no fallback here, so the Avatar component shows its generic
  // gray placeholder instead of a stranger's stock photo.
  const entryAvatarUrl = (entry: FeedEntry): string | undefined =>
    entry.barber.avatarUrl || (entry.isMock ? avatarFor(entry.barber.uid) : undefined);

  // The same set of photos shown in the grid below, so opening one from there lets the
  // viewer keep scrolling left/right through every other post instead of being stuck on
  // a single picture.
  const feedLightboxPhotos: LightboxPhoto[] = useMemo(() => postEntries.map(entry => ({
    url: entry.item.url,
    photoUrls: getItemPhotos(entry.item),
    name: entry.item.name,
    price: entry.item.price,
    createdAt: entry.item.createdAt || entry.barber.createdAt,
    barberName: `${entry.barber.firstName} ${entry.barber.lastName}`,
    barberAvatarUrl: entryAvatarUrl(entry),
    postId: hashPostId(entry.barber.uid, entry.item.url),
    onBarberClick: () => { setLightbox(null); openEntry(entry); },
  })), [postEntries]);

  const handleLogoutAll = () => {
    onLogoutFirebase();
    onLogout();
  };

  const handleOpenAccountSettings = () => {
    setPhoneInput(profile?.phone || '');
    setPhoneSaved(false);
    setShowDeleteConfirm(false);
    setDeletePassword('');
    setDeleteError(null);
    setShowAccountSettings(true);
  };

  const handleSavePhone = async () => {
    if (!phoneInput.trim()) return;
    setSavingPhone(true);
    try {
      await onUpdatePhone(phoneInput.trim());
      setPhoneSaved(true);
    } catch (e) {
      console.error('Error updating phone:', e);
    }
    setSavingPhone(false);
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteAccount(deletePassword);
    } catch (e: any) {
      setDeleteError(e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential'
        ? 'Mot de passe incorrect.'
        : 'La suppression a échoué. Réessayez.');
      setDeleting(false);
    }
  };

  const handleSearch = () => {
    document.getElementById('style-gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openEntry = (entry: FeedEntry) => {
    setSelectedEntry(entry);
  };

  // A "?barber=" link lets whoever opens it land straight on this pro's own profile
  // (see the resolver below) instead of just the generic homepage — same pattern as the
  // per-post "?post=" share link.
  const handleShareProfile = async (uid: string, name: string) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?barber=${encodeURIComponent(uid)}`;
    const shareData = { title: 'BarberGo', text: `${name} sur BarberGo`, url: shareUrl };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard) await navigator.clipboard.writeText(shareData.url);
    } catch {
      // User cancelled the native share sheet — nothing to do.
    }
  };

  // The pro's real chosen specialties when they've set any; mock/demo entries fall back
  // to the single category of the post itself so the row still shows something useful.
  const entryCategories = (entry: FeedEntry): string[] =>
    entry.barber.categories && entry.barber.categories.length > 0
      ? entry.barber.categories
      : (entry.item.category ? [entry.item.category] : []);

  // A "Partager" link should drop the visitor straight onto that specific post, not just
  // the generic search page — resolve the shared postId against the full (unfiltered)
  // feed once barbers have loaded, and open it directly in the fullscreen viewer.
  const resolvedSharedPostRef = useRef(false);
  useEffect(() => {
    if (!sharedPostId || resolvedSharedPostRef.current || feedEntries.length === 0) return;
    const match = feedEntries.find(e => hashPostId(e.barber.uid, e.item.url) === sharedPostId);
    if (!match) return;
    resolvedSharedPostRef.current = true;
    openLightbox([{
      url: match.item.url,
      photoUrls: getItemPhotos(match.item),
      name: match.item.name,
      price: match.item.price,
      createdAt: match.item.createdAt || match.barber.createdAt,
      barberName: `${match.barber.firstName} ${match.barber.lastName}`,
      barberAvatarUrl: entryAvatarUrl(match),
      postId: sharedPostId,
      onBarberClick: () => { setLightbox(null); openEntry(match); },
    }], 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedPostId, feedEntries]);

  // A "Partager" link on a pro's profile ("?barber=<uid>") should drop the visitor
  // straight onto that pro's profile, same pattern as the per-post deep link above.
  const resolvedSharedBarberRef = useRef(false);
  useEffect(() => {
    if (!sharedBarberId || resolvedSharedBarberRef.current || feedEntries.length === 0) return;
    const match = feedEntries.find(e => e.barber.uid === sharedBarberId);
    if (!match) return;
    resolvedSharedBarberRef.current = true;
    setActiveTab('search');
    openEntry(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedBarberId, feedEntries]);

  // One row per pro (not per post) for the "Profils" tab and the "Pour vous" top-5 —
  // real average rating from reviewCount/ratingSum (never the old flat 4.9 placeholder),
  // sorted nearest-first when the client's location is known.
  const uniqueProfiles = useMemo(() => {
    const seen = new Set<string>();
    const rows: { entry: FeedEntry; rating: number | null; reviewCount?: number; distance: number | null }[] = [];
    filteredEntries.forEach(entry => {
      if (seen.has(entry.barber.uid)) return;
      seen.add(entry.barber.uid);
      const reviewCount = entry.barber.reviewCount || 0;
      rows.push({
        entry,
        rating: entry.isMock ? entry.rating : (reviewCount > 0 ? (entry.barber.ratingSum || 0) / reviewCount : null),
        reviewCount: entry.isMock ? undefined : reviewCount,
        distance: getDistance(entry.barber, entry.city),
      });
    });
    return rows.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  }, [filteredEntries, clientLocation]);

  const quickBook = (entry: FeedEntry) => {
    setSelectedEntry(entry);
    setShowBooking(true);
  };

  const handleBook = async (serviceId: string, serviceName: string, dateTime: Date, totalPrice: number, proposedPrice?: number, clientNotes?: string) => {
    if (!selectedBarber) return;
    await onClientBook(selectedBarber.uid, serviceId, serviceName, dateTime, totalPrice, proposedPrice, clientNotes);
  };

  const handleGuestBook = async (
    registerData: { firstName: string; email: string; password: string },
    serviceId: string,
    serviceName: string,
    dateTime: Date,
    totalPrice: number,
    clientNotes?: string
  ) => {
    if (!selectedBarber) return;
    await onGuestRegisterAndBook(registerData, selectedBarber.uid, serviceId, serviceName, dateTime, totalPrice, clientNotes);
  };

  return (
    <div className={`h-screen flex flex-col pt-16 font-dm-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-gray-100'}`}>
      {/* APP TOP BAR */}
      <div className={`border-b px-4 py-3 flex items-center justify-between z-40 transition-colors duration-300 ${theme === 'dark' ? 'bg-mid-brown border-gold/20' : 'bg-white border-gray-200 shadow-sm'}`}>
         <button
           onClick={() => { if (selectedEntry) { setSelectedEntry(null); } else { onLogout(); } }}
           className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border transition-colors text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'border-white/10 text-warm-gray hover:text-gold hover:border-gold/30' : 'border-gray-200 text-gray-500 hover:text-gold hover:border-gold/30'}`}
         >
           <ArrowLeft size={14} />
           Retour
         </button>
         {profile ? (
           <button
             onClick={() => setShowProfileModal(true)}
             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border transition-colors text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'border-white/10 text-warm-gray hover:text-gold hover:border-gold/30' : 'border-gray-200 text-gray-500 hover:text-gold hover:border-gold/30'}`}
           >
             <User size={14} />
             {profile.firstName}
           </button>
         ) : (
           <button
             onClick={onLogin}
             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border transition-colors text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'border-white/10 text-warm-gray hover:text-gold hover:border-gold/30' : 'border-gray-200 text-gray-500 hover:text-gold hover:border-gold/30'}`}
           >
             <User size={14} />
             Se connecter
           </button>
         )}
      </div>

      <div className={`flex-1 overflow-y-auto pb-20 transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'}`}>
        {activeTab === 'chat' ? (
          <ChatListTab
            currentUid={profile?.uid || ''}
            theme={theme}
            conversations={chatConversations}
            barbers={barbers}
            services={services}
            clientPhone={profile?.phone}
            onUpdateAppointment={onUpdateAppointment}
            onUpdateStatus={onUpdateStatus}
            onMarkAsRead={markChatAsRead}
            onDeleteConversation={hideChatForMe}
            initialSelectedAppointmentId={chatInitialSelectedId}
            onInitialSelectedConsumed={() => setChatInitialSelectedId(null)}
          />
        ) : activeTab === 'bookings' ? (
          <MyBookingsSection
            appointments={appointments}
            barbers={barbers}
            services={services}
            theme={theme}
            clientId={user?.uid}
            clientPhone={profile?.phone}
            onUpdateStatus={onUpdateStatus}
            onUpdateAppointment={onUpdateAppointment}
            onAddReview={onAddReview}
            onOpenChat={(appointmentId) => { setChatInitialSelectedId(appointmentId); setActiveTab('chat'); }}
          />
        ) : (
        <AnimatePresence mode="wait">
          {selectedBarber && selectedEntry ? (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
              <div className="p-4 flex items-center justify-between">
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold hover:opacity-80 transition-opacity"
                >
                  <ArrowLeft size={14} /> Retour à la recherche
                </button>
                <button
                  onClick={() => handleShareProfile(selectedBarber.uid, `${selectedBarber.firstName} ${selectedBarber.lastName}`)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${theme === 'dark' ? 'border-white/10 text-warm-gray hover:text-gold hover:border-gold/30' : 'border-gray-200 text-gray-500 hover:text-gold hover:border-gold/30'}`}
                >
                  <Share2 size={14} /> Partager
                </button>
              </div>

              {/* COVER */}
              <button
                onClick={() => openLightbox([{ url: (selectedEntry.isMock ? selectedEntry.item.url : selectedBarber.coverUrl) || SALON_COVER_PHOTO }], 0)}
                className="h-32 md:h-40 w-full relative overflow-hidden block"
              >
                 <img src={(selectedEntry.isMock ? selectedEntry.item.url : selectedBarber.coverUrl) || SALON_COVER_PHOTO} alt="" className="w-full h-full object-cover" />
                 <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'dark' ? 'from-black via-black/20' : 'from-white via-white/10'} to-transparent`} />
              </button>

              <div className="p-6 -mt-12 relative">
                 <div className="flex gap-5 items-end mb-6">
                    {(() => {
                      const avatarSrc = entryAvatarUrl(selectedEntry);
                      const avatarNode = (
                        <Avatar
                          src={avatarSrc}
                          alt={selectedBarber.firstName}
                          size="w-24 h-24"
                          className={`shadow-xl border-4 ${theme === 'dark' ? 'border-black' : 'border-white'}`}
                        />
                      );
                      return avatarSrc ? (
                        <button onClick={() => openLightbox([{ url: avatarSrc }], 0)} className="shrink-0">{avatarNode}</button>
                      ) : (
                        <div className="shrink-0">{avatarNode}</div>
                      );
                    })()}
                    <div className="flex-1 pb-1">
                       <h2 className={`text-2xl font-bebas tracking-wider mb-1 uppercase flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                         {selectedBarber.firstName} {selectedBarber.lastName}
                         {selectedBarber.kycStatus === 'verified' && <BadgeCheck size={18} className="text-gold" />}
                       </h2>
                       <p className="text-gold text-xs uppercase tracking-widest font-bold mb-1">
                         {selectedBarber.gender === 'femme' ? 'Professionnelle Beauté' : 'Professionnel Beauté'}
                         {selectedBarber.ageRange && ` · ${selectedBarber.ageRange} ans`}
                       </p>
                       <p className="text-warm-gray text-[10px] uppercase tracking-widest flex items-center gap-1">
                         <MapPin size={10} /> {selectedEntry.city}{selectedBarber.locationCountry ? `, ${selectedBarber.locationCountry}` : ''}
                       </p>
                    </div>
                 </div>

                 <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                      getDistance(selectedBarber, selectedEntry.city) !== null
                        ? { val: `${getDistance(selectedBarber, selectedEntry.city)} km`, label: 'Distance' }
                        : { val: '5+', label: 'Ans' },
                      selectedEntry.isMock
                        ? { val: '1k+', label: 'Clients' }
                        : { val: `${selectedBarber.completedCount || 0}`, label: 'Clients' },
                      selectedEntry.isMock
                        ? { val: `${selectedEntry.rating}★`, label: 'Note' }
                        : { val: reviewStats && reviewStats.count > 0 ? `${reviewStats.avg.toFixed(1)}★` : 'Nouveau', label: reviewStats && reviewStats.count > 0 ? `${reviewStats.count} avis` : 'Note' },
                      { val: `${selectedEntry.item.price} DH`, label: 'Dès' }
                    ].map((stat, i) => (
                      <div key={i} className={`text-center p-2 rounded-sm border ${theme === 'dark' ? 'bg-mid-brown/30 border-gold/10' : 'bg-gray-50 border-gray-200'}`}>
                         <div className="text-gold font-bebas text-xl leading-none">{stat.val}</div>
                         <div className="text-[8px] text-warm-gray uppercase font-bold">{stat.label}</div>
                      </div>
                    ))}
                 </div>

                 <div className="mb-8">
                   <div className="text-[10px] text-warm-gray uppercase tracking-widest font-bold mb-4">À propos</div>
                   <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                     {selectedEntry.isMock || !selectedBarber.bio
                       ? "Spécialiste du dégradé américain et de la taille de barbe traditionnelle. Plusieurs années d'expérience dans les meilleurs salons de la capitale."
                       : selectedBarber.bio}
                   </p>
                 </div>

                 <button
                   onClick={() => setShowBooking(true)}
                   className="w-full btn-primary py-5 mb-8 flex items-center justify-center gap-3 group"
                 >
                   <CalendarDays size={18} />
                   <span className="uppercase font-bold tracking-[0.2em]">Prendre rendez-vous</span>
                   <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                 </button>

                 <div className="mb-8">
                   <div className="text-lg font-bebas text-gold uppercase tracking-widest mb-4">Réalisations</div>
                   <div className="grid grid-cols-4 gap-2">
                     {realizationPhotos.map((photo, i) => (
                       <button key={i} onClick={() => openLightbox(realizationPhotos, i)} className="relative aspect-square rounded-sm overflow-hidden border border-gold/15">
                         <img src={photo.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                         {photo.photoUrls && photo.photoUrls.length > 1 && (
                           <span className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                             <Layers size={9} /> {photo.photoUrls.length}
                           </span>
                         )}
                       </button>
                     ))}
                   </div>
                   {!selectedEntry.isMock && (selectedBarber.portfolioItems || []).length === 0 && (
                     <p className="text-xs text-warm-gray/50 uppercase tracking-widest text-center py-6">Aucune photo publiée pour le moment</p>
                   )}
                 </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto px-4 py-8 md:py-12">
              <div className="mb-6">
                <h1 className={`font-bebas text-3xl md:text-4xl tracking-wide uppercase mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Trouvez votre professionnel</h1>
                <p className="text-warm-gray text-sm">Recherchez selon la disponibilité, le genre et la prestation que vous voulez.</p>
              </div>

              {/* CATEGORY RAIL */}
              <CategoryRail selected={selectedCategory} onSelect={setSelectedCategory} theme={theme} />

              {/* BOOKING-STYLE SEARCH BAR */}
              <SearchBar
                theme={theme}
                searchGender={searchGender}
                onSearchGenderChange={setSearchGender}
                searchCity={searchCity}
                onSearchCityChange={setSearchCity}
                moroccanCities={moroccanCities}
                searchDateTime={searchDateTime}
                onSearchDateTimeChange={setSearchDateTime}
                searchStyle={searchStyle}
                onSearchStyleChange={setSearchStyle}
                onSearch={handleSearch}
              />
              <p className="text-warm-gray text-[10px] uppercase tracking-widest mb-4">
                {filteredEntries.length} professionnel{filteredEntries.length > 1 ? 's' : ''} disponible{filteredEntries.length > 1 ? 's' : ''}
              </p>

              {/* RESULTS TAB SWITCHER: "Pour vous" (profils + publications) / "Profils" (liste complète) */}
              <div className="flex gap-2 mb-6">
                {([
                  { id: 'pourVous' as const, label: 'Pour vous' },
                  { id: 'profils' as const, label: 'Profils' },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setResultsTab(tab.id)}
                    className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                      resultsTab === tab.id
                        ? 'bg-gold text-black border-gold'
                        : theme === 'dark' ? 'border-white/15 text-warm-gray hover:border-gold/40' : 'border-gray-200 text-gray-500 hover:border-gold/40'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div id="style-gallery">
                {resultsTab === 'pourVous' && uniqueProfiles.length > 0 && (
                  <div className="mb-8">
                    <h2 className={`font-bebas text-xl tracking-widest uppercase mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Profils</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {uniqueProfiles.slice(0, 5).map(({ entry, rating, reviewCount, distance }) => (
                        <ProfileRow
                          key={entry.barber.uid}
                          avatarUrl={entryAvatarUrl(entry)}
                          name={`${entry.barber.firstName} ${entry.barber.lastName}`}
                          verified={entry.barber.kycStatus === 'verified'}
                          rating={rating}
                          reviewCount={reviewCount}
                          distanceKm={distance}
                          categories={entryCategories(entry)}
                          theme={theme}
                          onClick={() => openEntry(entry)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {resultsTab === 'profils' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {uniqueProfiles.map(({ entry, rating, reviewCount, distance }) => (
                      <ProfileRow
                        key={entry.barber.uid}
                        avatarUrl={entryAvatarUrl(entry)}
                        name={`${entry.barber.firstName} ${entry.barber.lastName}`}
                        verified={entry.barber.kycStatus === 'verified'}
                        rating={rating}
                        reviewCount={reviewCount}
                        distanceKm={distance}
                        theme={theme}
                        onClick={() => openEntry(entry)}
                      />
                    ))}
                    {uniqueProfiles.length === 0 && (
                      <div className="col-span-full text-center py-16 text-warm-gray text-xs uppercase tracking-widest">Aucun résultat pour ces critères</div>
                    )}
                  </div>
                ) : (
                  <>
                    <h2 className={`font-bebas text-xl tracking-widest uppercase mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Publications</h2>

                    {/* MOBILE: Instagram/Reels-style full-bleed vertical feed */}
                    <div className="flex flex-col gap-4 md:hidden">
                      {barbersLoading && postEntries.length === 0 && (
                        Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`skeleton-m-${i}`} theme={theme} />)
                      )}
                      {postEntries.map((entry, i) => (
                        <MobilePostCard
                          key={i}
                          postId={hashPostId(entry.barber.uid, entry.item.url)}
                          photoUrl={entry.item.url}
                          photoCount={getItemPhotos(entry.item).length}
                          caption={entry.item.name}
                          price={entry.item.price}
                          city={entry.city}
                          barberAvatarUrl={entryAvatarUrl(entry)}
                          barberName={`${entry.barber.firstName} ${entry.barber.lastName}`}
                          verified={entry.barber.kycStatus === 'verified'}
                          onOpenPhoto={() => openLightbox(feedLightboxPhotos, i)}
                          onOpenProfile={() => openEntry(entry)}
                          onFetchLikeState={onFetchLikeState}
                          onToggleLike={onToggleLike}
                          isLoggedIn={!!user}
                          onRequireAuth={onLogin}
                        />
                      ))}
                    </div>

                    {/* DESKTOP/TABLET: Facebook-style single-column feed */}
                    <div className="hidden md:flex md:flex-col gap-6">
                      {barbersLoading && postEntries.length === 0 && (
                        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={`skeleton-${i}`} theme={theme} />)}
                        </div>
                      )}
                      {postEntries.map((entry, i) => (
                        <DesktopPostCard
                          key={i}
                          postId={hashPostId(entry.barber.uid, entry.item.url)}
                          photoUrl={entry.item.url}
                          photoCount={getItemPhotos(entry.item).length}
                          caption={entry.item.name}
                          price={entry.item.price}
                          city={entry.city}
                          createdAtLabel={(entry.item.createdAt || entry.barber.createdAt) ? formatRelativeTime(entry.item.createdAt || entry.barber.createdAt) : undefined}
                          barberAvatarUrl={entryAvatarUrl(entry)}
                          barberName={`${entry.barber.firstName} ${entry.barber.lastName}`}
                          verified={entry.barber.kycStatus === 'verified'}
                          theme={theme}
                          onOpenPhoto={() => openLightbox(feedLightboxPhotos, i)}
                          onOpenProfile={() => openEntry(entry)}
                          onFetchLikeState={onFetchLikeState}
                          onToggleLike={onToggleLike}
                          isLoggedIn={!!user}
                          onRequireAuth={onLogin}
                        />
                      ))}
                    </div>
                    {postEntries.length === 0 && (
                      <div className="text-center py-16 text-warm-gray text-xs uppercase tracking-widest">Aucune publication pour ces critères</div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>

      {/* BOTTOM NAV */}
      <nav className={`fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-md ${theme === 'dark' ? 'bg-black/90 border-gold/20' : 'bg-white/95 border-gray-200'}`}>
        <div className="max-w-md mx-auto grid grid-cols-3">
          {([
            { id: 'search' as const, label: 'Rechercher', Icon: Search, badge: 0 },
            { id: 'bookings' as const, label: 'Mes Réservations', Icon: CalendarCheck, badge: newProposalsCount },
            { id: 'chat' as const, label: 'Chat', Icon: MessageCircle, badge: chatTotalUnread }
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id !== 'search' && !profile) { onLogin(); return; }
                setActiveTab(tab.id);
                setSelectedEntry(null);
              }}
              className={`flex flex-col items-center gap-1 py-3 transition-colors ${activeTab === tab.id ? 'text-gold' : 'text-warm-gray hover:text-white'}`}
            >
              <div className="relative">
                <tab.Icon size={20} />
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {selectedBarber && (
        <BookingModal
          isOpen={showBooking}
          onClose={() => setShowBooking(false)}
          barber={selectedBarber}
          services={barberServicesForBooking}
          onBook={handleBook}
          profile={profile}
          onGuestRegisterAndBook={handleGuestBook}
          theme={theme}
        />
      )}

      {/* FULLSCREEN PHOTO VIEWER */}
      {lightbox && (
        <PhotoGalleryLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          onFetchLikeState={onFetchLikeState}
          onToggleLike={onToggleLike}
          isLoggedIn={!!user}
          onRequireAuth={onLogin}
        />
      )}

      {/* PROFILE MODAL */}
      <AnimatePresence>
        {showProfileModal && profile && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowProfileModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm border rounded-sm overflow-hidden transition-all duration-300 ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200 shadow-2xl'}`}
            >
               <div className="p-6 border-b border-gold/10 flex justify-between items-center bg-gold/5">
                  <h3 className="font-bebas text-xl text-gold tracking-widest uppercase">{showAccountSettings ? 'Paramètres du compte' : 'Mon Compte'}</h3>
                  <button onClick={() => setShowProfileModal(false)} className="text-warm-gray hover:text-gold transition-colors"><X size={20} /></button>
               </div>

               {!showAccountSettings ? (
                 <div className="p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-gold/10 rounded-full border-2 border-gold flex items-center justify-center mx-auto">
                       <User size={40} className="text-gold" />
                    </div>
                    <div>
                      <h4 className={`text-2xl font-bebas tracking-wider uppercase ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{profile.firstName} {profile.lastName}</h4>
                      <p className="text-gold text-[10px] font-bold uppercase tracking-widest mt-1">Membre BarberGo</p>
                    </div>
                    <div className="space-y-2">
                       <div className={`p-4 rounded-sm border flex justify-between items-center ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                          <span className="text-[10px] text-warm-gray uppercase font-bold">Email</span>
                          <span className={`text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{profile.email}</span>
                       </div>
                       <div className={`p-4 rounded-sm border flex justify-between items-center ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                          <span className="text-[10px] text-warm-gray uppercase font-bold">Mobile</span>
                          <span className={`text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{profile.phone}</span>
                       </div>
                       <button
                         type="button"
                         onClick={handleOpenAccountSettings}
                         className={`w-full p-4 rounded-sm border flex justify-between items-center text-left ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}
                       >
                         <span className="text-[10px] text-warm-gray uppercase font-bold">Paramètres du compte</span>
                         <ChevronRight size={14} className="text-gold" />
                       </button>
                    </div>
                    <button
                      onClick={handleLogoutAll}
                      className="w-full py-4 border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all rounded-sm text-[10px] font-bold uppercase tracking-widest"
                    >
                      Déconnexion
                    </button>
                 </div>
               ) : (
                 <div className="p-6 text-left space-y-5">
                    <button
                      onClick={() => setShowAccountSettings(false)}
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-warm-gray hover:text-gold transition-colors"
                    >
                      <ArrowLeft size={14} /> Retour
                    </button>

                    <div className="space-y-2">
                      <span className="text-[10px] text-warm-gray uppercase font-bold block">Changer de numéro</span>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={phoneInput}
                          onChange={(e) => { setPhoneInput(e.target.value); setPhoneSaved(false); }}
                          placeholder="+212 6 XX XX XX XX"
                          className={`flex-1 px-4 py-2.5 text-xs outline-none rounded-lg border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                        />
                        <button
                          onClick={handleSavePhone}
                          disabled={savingPhone || !phoneInput.trim()}
                          className="px-5 py-2.5 bg-gold text-black text-[10px] uppercase font-bold tracking-widest hover:bg-gold-light rounded-lg disabled:opacity-40 shrink-0"
                        >
                          {savingPhone ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                      </div>
                      {phoneSaved && <p className="text-[10px] text-emerald-400 font-bold uppercase">Numéro mis à jour !</p>}
                    </div>

                    <div className="border border-red-500/30 rounded-sm p-4 space-y-3">
                      <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Zone dangereuse</p>
                      <p className="text-xs text-warm-gray leading-relaxed">La suppression de votre compte est définitive et irréversible.</p>
                      {!showDeleteConfirm ? (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="w-full py-3 border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all rounded-sm text-[10px] font-bold uppercase tracking-widest"
                        >
                          Supprimer mon compte
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="password"
                            value={deletePassword}
                            onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(null); }}
                            placeholder="Votre mot de passe"
                            className={`w-full px-4 py-2.5 text-xs outline-none rounded-lg border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                          />
                          {deleteError && <p className="text-[10px] text-red-500">{deleteError}</p>}
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(null); }}
                              className="flex-1 py-2.5 border border-white/10 text-warm-gray text-[10px] font-bold uppercase tracking-widest rounded-sm"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={handleDeleteAccount}
                              disabled={!deletePassword || deleting}
                              className="flex-1 py-2.5 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm disabled:opacity-40"
                            >
                              {deleting ? 'Suppression...' : 'Confirmer la suppression'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                 </div>
               )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
