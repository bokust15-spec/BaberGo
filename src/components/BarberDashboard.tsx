import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  User,
  CalendarCheck,
  CalendarDays,
  ArrowLeft,
  Camera,
  Plus,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Clock,
  Moon as MoonIcon,
  Navigation,
  Scissors,
  MapPin,
  Star,
  BadgeCheck,
  Users
} from 'lucide-react';
import { Appointment, UserProfile, Service, PortfolioItem, BarberService, Review } from '../hooks/useFirebase';
import { StylePost, STYLE_POSTS, avatarFor, PORTFOLIO_PHOTOS, mockBarberFromPost, CITY_COORDS } from '../data/mockBarberFeed';
import CategoryRail from './CategoryRail';
import { SERVICE_CATEGORIES } from '../data/categories';
import PhotoGalleryLightbox, { LightboxPhoto } from './PhotoGalleryLightbox';
import SearchBar from './SearchBar';
import BookingModal from './BookingModal';
import { formatRelativeTime } from '../utils/relativeTime';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

interface FeedEntry {
  barber: UserProfile;
  item: PortfolioItem;
  isMock: boolean;
  rating: number;
  city: string;
  availableDays: number[];
}

function toDate(value: any): Date {
  return value instanceof Date ? value : value.toDate();
}

// Deterministic mock distance (km) between the barber and a given appointment,
// consistent with the existing hash-based mock location pattern used elsewhere.
export function getDistanceKm(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const raw = Math.abs(hash) % 150;
  return Math.round((0.5 + (raw / 150) * 14.5) * 10) / 10;
}

interface BarberDashboardProps {
  profile: UserProfile;
  barbers: UserProfile[];
  appointments: Appointment[];
  services: Service[];
  onUpdateStatus: (id: string, status: Appointment['status']) => Promise<void>;
  onUpdateAppointment?: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onLogout: () => void;
  onLogoutFirebase: () => void;
  theme: 'dark' | 'light';
  onUpdateBio: (bio: string) => Promise<void>;
  onUpdatePhone: (phone: string) => Promise<void>;
  onUpdateCity: (city: string) => Promise<void>;
  onUpdateAgeRange: (ageRange: UserProfile['ageRange']) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<string | undefined>;
  onUploadCover: (file: File) => Promise<string | undefined>;
  onAddPortfolioItem: (file: File, name: string, price: number, category?: string) => Promise<PortfolioItem | undefined>;
  onRemovePortfolioItem: (item: PortfolioItem) => Promise<void>;
  onUpdateAvailability: (updates: Partial<Pick<UserProfile, 'workingDays' | 'workStartHour' | 'workEndHour' | 'basePrice' | 'nightEnabled' | 'nightStartHour' | 'nightPrice'>>) => Promise<void>;
  onUpdateCategories: (categories: string[]) => Promise<void>;
  onUpdateServices: (services: BarberService[]) => Promise<void>;
  onBookBarber: (barberId: string, item: { name: string; price: number }, dateTime: Date, note?: string) => Promise<void>;
  onUploadKycFile: (file: File, type: 'cin' | 'selfie') => Promise<string | undefined>;
  onSubmitKycDossier: (cinUrl: string, selfieUrl: string) => Promise<void>;
  onGetBarberReviews: (barberId: string) => Promise<Review[]>;
  dayVisitors: number;
}

export default function BarberDashboard({
  profile,
  barbers,
  appointments,
  onUpdateStatus,
  onUpdateAppointment,
  onLogout,
  onLogoutFirebase,
  theme,
  onUpdateBio,
  onUpdatePhone,
  onUpdateCity,
  onUpdateAgeRange,
  onUploadAvatar,
  onUploadCover,
  onAddPortfolioItem,
  onRemovePortfolioItem,
  onUpdateAvailability,
  onUpdateCategories,
  onUpdateServices,
  onBookBarber,
  onUploadKycFile,
  onSubmitKycDossier,
  onGetBarberReviews,
  dayVisitors
}: BarberDashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'bookings'>('home');
  const [kycCinUrl, setKycCinUrl] = useState<string | null>(null);
  const [kycSelfieUrl, setKycSelfieUrl] = useState<string | null>(null);
  const [uploadingCin, setUploadingCin] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<FeedEntry | null>(null);
  const [quickBookRequested, setQuickBookRequested] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchGender, setSearchGender] = useState<'' | 'homme' | 'femme'>('');
  const [searchCity, setSearchCity] = useState('');
  const [searchDateTime, setSearchDateTime] = useState('');
  const [searchStyle, setSearchStyle] = useState('');
  const moroccanCities = useMemo(() => Object.keys(CITY_COORDS).sort(), []);
  const [phoneInput, setPhoneInput] = useState(profile.phone || '');
  const [savingPhone, setSavingPhone] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Notification badge on the "Réservation" tab — real count of new booking requests
  // awaiting the pro's response, like an unread count.
  const pendingBookingsCount = useMemo(
    () => appointments.filter(a => a.status === 'pending').length,
    [appointments]
  );

  const handleLogoutAll = () => {
    onLogoutFirebase();
    onLogout();
  };

  const kycStatus = profile.kycStatus || 'unverified';
  const hasPhone = !!profile.phone;
  const profileIncomplete = !hasPhone || kycStatus !== 'verified';
  const isBlocked = profileIncomplete;

  const handleSavePhone = async () => {
    if (!phoneInput.trim()) return;
    setSavingPhone(true);
    try {
      await onUpdatePhone(phoneInput.trim());
    } catch (e) {
      console.error('Error updating phone:', e);
    }
    setSavingPhone(false);
  };

  const handleKycFileSelected = async (type: 'cin' | 'selfie', file: File) => {
    const setUploading = type === 'cin' ? setUploadingCin : setUploadingSelfie;
    const setUrl = type === 'cin' ? setKycCinUrl : setKycSelfieUrl;
    setUploading(true);
    try {
      const url = await onUploadKycFile(file, type);
      if (url) {
        setUrl(url);
        const otherUrl = type === 'cin' ? kycSelfieUrl : kycCinUrl;
        if (otherUrl) {
          await onSubmitKycDossier(type === 'cin' ? url : otherUrl, type === 'cin' ? otherUrl : url);
        }
      }
    } catch (e) {
      console.error('Error uploading KYC file:', e);
    }
    setUploading(false);
  };

  // Commission tracking (calcul automatique à la fin d'une prestation) sera géré côté
  // serveur par une Cloud Function dans une prochaine phase — les règles Firestore
  // interdisent désormais au barbier de modifier ses propres champs de commission.
  const handleCompleteSession = async (app: Appointment) => {
    if (!onUpdateAppointment) return;
    await onUpdateAppointment(app.id, { status: 'completed' });
  };

  // The Accueil feed shows every real barber's uploaded work — including the
  // currently logged-in barber's own posts — plus the same mock style feed clients
  // see (STYLE_POSTS); everyone sees the exact same discovery experience.
  const feedItems = useMemo(() => {
    const items: FeedEntry[] = [];
    barbers.forEach(b => {
      const availableDays = b.workingDays && b.workingDays.length > 0 ? b.workingDays : [1, 2, 3, 4, 5, 6];
      if (b.portfolioItems && b.portfolioItems.length > 0) {
        b.portfolioItems.forEach(item => items.push({ barber: b, item, isMock: false, rating: 4.9, city: b.city || 'Casablanca', availableDays }));
      } else if (b.categories && b.categories.length > 0) {
        const image = b.avatarUrl || b.coverUrl || avatarFor(b.uid);
        const startingPrice = b.services && b.services.length > 0 ? Math.min(...b.services.map(s => s.price)) : 0;
        b.categories.forEach(categoryId => {
          items.push({
            barber: b,
            item: { url: image, name: `${b.firstName} ${b.lastName}`.trim(), price: startingPrice, category: categoryId },
            isMock: false,
            rating: 4.9,
            city: b.city || 'Casablanca',
            availableDays
          });
        });
      }
    });
    STYLE_POSTS.forEach(post => {
      items.push({
        barber: mockBarberFromPost(post),
        item: { url: post.photo, name: post.style, price: post.priceFrom, category: post.category, createdAt: post.createdAt },
        isMock: true,
        rating: post.rating,
        city: post.city,
        availableDays: post.availableDays
      });
    });
    return items;
  }, [barbers]);

  const filteredFeedItems = useMemo(() => {
    const selectedDay = searchDateTime ? new Date(searchDateTime).getDay() : null;
    const results = feedItems.filter(e => {
      if (selectedCategory && (e.item.category || 'cheveux') !== selectedCategory) return false;
      if (searchGender && e.barber.gender !== searchGender) return false;
      if (searchCity && e.city !== searchCity) return false;
      if (selectedDay !== null && !e.availableDays.includes(selectedDay)) return false;
      return true;
    });
    const style = searchStyle.trim().toLowerCase();
    if (!style) return results;
    return [...results].sort((a, b) => {
      const aMatch = a.item.name.toLowerCase().includes(style) ? 0 : 1;
      const bMatch = b.item.name.toLowerCase().includes(style) ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [feedItems, selectedCategory, searchGender, searchCity, searchDateTime, searchStyle]);

  return (
    <div className={`min-h-screen pt-20 pb-24 flex flex-col font-dm-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>

      {/* Dashboard Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-40 border-b pl-16 pr-6 py-4 flex items-center justify-between backdrop-blur-md ${theme === 'dark' ? 'bg-black/80 border-gold/20' : 'bg-white/80 border-gray-200 shadow-sm'}`}>
        <div className="logo text-2xl text-gold font-bebas tracking-widest leading-none">PRO</div>
        <div className="flex items-center gap-2">
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-warm-gray hover:text-gold transition-colors text-[10px] font-bold uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Retour
          </button>
          <button
            onClick={() => setShowAccountModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-warm-gray hover:text-gold transition-colors text-[10px] font-bold uppercase tracking-widest"
          >
            <User size={14} /> {profile.firstName}
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full">

        {/* BANNER: PROFIL INCOMPLET */}
        {profileIncomplete && (
          <div className={`mb-6 p-5 rounded-xl border ${theme === 'dark' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'} space-y-4`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-500 mt-0.5 shrink-0 animate-pulse" size={20} />
              <div>
                <h3 className="font-bebas text-base tracking-wider text-amber-500 uppercase">Profil incomplet (téléphone + KYC requis)</h3>
                <p className="text-xs text-warm-gray leading-relaxed">
                  Renseignez votre numéro et votre dossier (CIN + Selfie) pour pouvoir accepter des réservations.
                </p>
              </div>
            </div>

            {!hasPhone && (
              <div className="space-y-2">
                <span className="text-[9px] text-warm-gray uppercase font-bold block">Numéro de téléphone</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+212 6 XX XX XX XX"
                    className={`flex-1 px-4 py-2.5 text-xs outline-none rounded-lg border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                  />
                  <button
                    onClick={handleSavePhone}
                    disabled={savingPhone || !phoneInput.trim()}
                    className="px-5 py-2.5 bg-gold text-black text-[10px] uppercase font-bold tracking-widest hover:bg-gold-light rounded-lg disabled:opacity-40 font-sans shrink-0"
                  >
                    {savingPhone ? 'Enregistrement...' : 'Enregistrer mon numéro'}
                  </button>
                </div>
              </div>
            )}

            {kycStatus === 'unverified' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label
                  className={`p-3 border border-dashed rounded-lg text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    kycCinUrl ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-white/10 hover:border-gold/30 text-warm-gray'
                  }`}
                >
                  <span>{uploadingCin ? 'Envoi en cours...' : kycCinUrl ? '✔ CIN téléversée' : '📁 Téléverser votre CIN'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingCin}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleKycFileSelected('cin', f); }}
                  />
                </label>
                <label
                  className={`p-3 border border-dashed rounded-lg text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    kycSelfieUrl ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-white/10 hover:border-gold/30 text-warm-gray'
                  }`}
                >
                  <span>{uploadingSelfie ? 'Envoi en cours...' : kycSelfieUrl ? '✔ Selfie téléversé' : '📁 Téléverser un Selfie'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingSelfie}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleKycFileSelected('selfie', f); }}
                  />
                </label>
              </div>
            ) : kycStatus === 'pending' ? (
              <div className="flex items-center gap-3 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                <p className="text-xs text-warm-gray">Dossier en cours d'examen par l'équipe BarberGo (24–48h).</p>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'home' && (
          <HomeTab
            theme={theme}
            feedItems={filteredFeedItems}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onSelectEntry={(entry) => { setQuickBookRequested(false); setViewingEntry(entry); }}
            onQuickBook={(entry) => { setQuickBookRequested(true); setViewingEntry(entry); }}
            currentBarberUid={profile.uid}
            searchGender={searchGender}
            onSearchGenderChange={setSearchGender}
            searchCity={searchCity}
            onSearchCityChange={setSearchCity}
            moroccanCities={moroccanCities}
            searchDateTime={searchDateTime}
            onSearchDateTimeChange={setSearchDateTime}
            searchStyle={searchStyle}
            onSearchStyleChange={setSearchStyle}
            dayVisitors={dayVisitors}
          />
        )}

        {activeTab === 'profile' && (
          <MyProfileTab
            profile={profile}
            theme={theme}
            onUpdateBio={onUpdateBio}
            onUpdateCity={onUpdateCity}
            onUpdateAgeRange={onUpdateAgeRange}
            onUploadAvatar={onUploadAvatar}
            onUploadCover={onUploadCover}
            onAddPortfolioItem={onAddPortfolioItem}
            onRemovePortfolioItem={onRemovePortfolioItem}
            onUpdateAvailability={onUpdateAvailability}
            onUpdateCategories={onUpdateCategories}
            onUpdateServices={onUpdateServices}
          />
        )}

        {activeTab === 'bookings' && (
          <BookingsTab
            appointments={appointments}
            theme={theme}
            isBlocked={isBlocked}
            onUpdateStatus={onUpdateStatus}
            onUpdateAppointment={onUpdateAppointment}
            onCompleteSession={handleCompleteSession}
          />
        )}
      </main>

      {/* BOTTOM NAV */}
      <nav className={`fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-md ${theme === 'dark' ? 'bg-black/90 border-gold/20' : 'bg-white/95 border-gray-200'}`}>
        <div className="max-w-md mx-auto grid grid-cols-3">
          {([
            { id: 'home' as const, label: 'Accueil', Icon: Home, badge: 0 },
            { id: 'profile' as const, label: 'Mon Profil', Icon: User, badge: 0 },
            { id: 'bookings' as const, label: 'Réservation', Icon: CalendarCheck, badge: pendingBookingsCount }
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

      {/* MODAL: VIEW BARBER PROFILE + BOOK */}
      <AnimatePresence>
        {viewingEntry && (
          <BarberProfileModal
            entry={viewingEntry}
            initialShowBooking={quickBookRequested}
            theme={theme}
            onClose={() => { setViewingEntry(null); setQuickBookRequested(false); }}
            onBook={onBookBarber}
            viewerProfile={profile}
            onGetBarberReviews={onGetBarberReviews}
          />
        )}
      </AnimatePresence>

      {/* MODAL: MON COMPTE */}
      <AnimatePresence>
        {showAccountModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowAccountModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm border rounded-sm overflow-hidden transition-all duration-300 ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200 shadow-2xl'}`}
            >
              <div className="p-6 border-b border-gold/10 flex justify-between items-center bg-gold/5">
                <h3 className="font-bebas text-xl text-gold tracking-widest uppercase">Mon Compte</h3>
                <button onClick={() => setShowAccountModal(false)} className="text-warm-gray hover:text-gold transition-colors"><X size={20} /></button>
              </div>

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
                </div>
                <button
                  onClick={handleLogoutAll}
                  className="w-full py-4 border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all rounded-sm text-[10px] font-bold uppercase tracking-widest"
                >
                  Déconnexion
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// TAB: ACCUEIL — feed of every other barber's realizations
// ============================================================
function HomeTab({ theme, feedItems, selectedCategory, onSelectCategory, onSelectEntry, onQuickBook, currentBarberUid, searchGender, onSearchGenderChange, searchCity, onSearchCityChange, moroccanCities, searchDateTime, onSearchDateTimeChange, searchStyle, onSearchStyleChange, dayVisitors }: {
  theme: 'dark' | 'light';
  feedItems: FeedEntry[];
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  onSelectEntry: (entry: FeedEntry) => void;
  onQuickBook: (entry: FeedEntry) => void;
  currentBarberUid: string;
  searchGender: '' | 'homme' | 'femme';
  onSearchGenderChange: (v: '' | 'homme' | 'femme') => void;
  searchCity: string;
  onSearchCityChange: (v: string) => void;
  moroccanCities: string[];
  searchDateTime: string;
  onSearchDateTimeChange: (v: string) => void;
  searchStyle: string;
  onSearchStyleChange: (v: string) => void;
  dayVisitors: number;
}) {
  const [lightbox, setLightbox] = useState<{ photos: LightboxPhoto[]; index: number } | null>(null);

  // The same set of photos shown in the grid below, so opening one from there lets the
  // viewer keep scrolling left/right through every other post instead of being stuck on
  // a single picture.
  const feedLightboxPhotos: LightboxPhoto[] = useMemo(() => feedItems.map(entry => ({
    url: entry.item.url,
    name: entry.item.name,
    price: entry.item.price,
    createdAt: entry.item.createdAt || entry.barber.createdAt,
    barberName: `${entry.barber.firstName} ${entry.barber.lastName}`,
    onBarberClick: () => { setLightbox(null); onSelectEntry(entry); },
  })), [feedItems, onSelectEntry]);

  return (
    <div className="space-y-6 text-left">
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-bebas text-3xl tracking-widest text-gold uppercase">Accueil</h2>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-warm-gray text-[10px] font-bold uppercase tracking-widest">
            <Users size={14} className="text-gold" /> {dayVisitors.toLocaleString('fr-FR')} visiteur{dayVisitors > 1 ? 's' : ''} aujourd'hui
          </span>
        </div>
        <p className="text-xs text-warm-gray">Parcourez les réalisations des prestataires BarberGo et réservez une séance.</p>
      </div>

      <CategoryRail selected={selectedCategory} onSelect={onSelectCategory} theme={theme} />

      <SearchBar
        theme={theme}
        searchGender={searchGender}
        onSearchGenderChange={onSearchGenderChange}
        searchCity={searchCity}
        onSearchCityChange={onSearchCityChange}
        moroccanCities={moroccanCities}
        searchDateTime={searchDateTime}
        onSearchDateTimeChange={onSearchDateTimeChange}
        searchStyle={searchStyle}
        onSearchStyleChange={onSearchStyleChange}
        onSearch={() => {}}
      />
      <p className="text-warm-gray text-[10px] uppercase tracking-widest">
        {feedItems.length} professionnel{feedItems.length > 1 ? 's' : ''} disponible{feedItems.length > 1 ? 's' : ''}
      </p>

      {feedItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {feedItems.map((entry, i) => {
            const { barber, item, isMock, rating, city } = entry;
            const avatarSrc = barber.avatarUrl || (isMock ? avatarFor(barber.uid) : '');
            return (
              <div
                key={i}
                className={`rounded-lg overflow-hidden border ${theme === 'dark' ? 'border-gold/15 bg-mid-brown/20' : 'border-gray-200 bg-white'}`}
              >
                <button
                  onClick={() => setLightbox({ photos: feedLightboxPhotos, index: i })}
                  className="group w-full text-left block"
                >
                  <div className="relative aspect-square">
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                      <MapPin size={10} className="text-gold shrink-0" />
                      <span className="text-white text-[9px] font-bold uppercase tracking-wide">{city}</span>
                    </div>
                  </div>
                </button>
                <button onClick={() => onSelectEntry(entry)} className="w-full text-left block">
                  <div className="p-2.5">
                    <div className={`text-xs font-bold mb-1 truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{item.name}</div>
                    <div className="flex items-center gap-1.5 mb-2">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="" className="w-5 h-5 rounded-full object-cover border border-gold shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gold border border-gold shrink-0 flex items-center justify-center text-[7px] font-bold text-black">
                          {barber.firstName[0]}
                        </div>
                      )}
                      <span className="text-warm-gray text-[10px] truncate">{barber.firstName} {barber.lastName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-gold text-[10px] font-bold">
                        <Star size={10} className="fill-gold" /> {rating}
                      </div>
                      <div className="text-warm-gray text-[10px]">Dès <span className="text-gold font-bold">{item.price} DH</span></div>
                    </div>
                    {(item.createdAt || barber.createdAt) && (
                      <div className="text-warm-gray/60 text-[9px] mt-1">{formatRelativeTime(item.createdAt || barber.createdAt)}</div>
                    )}
                  </div>
                </button>
                {barber.uid !== currentBarberUid ? (
                  <button
                    onClick={() => onQuickBook(entry)}
                    className="w-full bg-gold text-black py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-gold-light transition-colors"
                  >
                    Réserver
                  </button>
                ) : (
                  <div className={`w-full py-2 text-[10px] font-bold uppercase tracking-widest text-center ${theme === 'dark' ? 'bg-black/30 text-warm-gray' : 'bg-gray-100 text-gray-400'}`}>
                    Votre réalisation
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`p-10 text-center border border-dashed rounded-xl opacity-60 ${theme === 'dark' ? 'border-gold/20' : 'border-gray-300'}`}>
          <Scissors size={28} className="mx-auto mb-3 text-gold/40" />
          <p className="text-xs uppercase tracking-widest font-bold">Aucune réalisation publiée pour le moment</p>
        </div>
      )}

      {lightbox && (
        <PhotoGalleryLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// MODAL: view a barber's full profile + inline booking form
// ============================================================
const MOCK_BIO_TEXT = "Spécialiste du dégradé américain et de la taille de barbe traditionnelle. Plusieurs années d'expérience dans les meilleurs salons de la capitale.";

function BarberProfileModal({ entry, initialShowBooking, theme, onClose, onBook, viewerProfile, onGetBarberReviews }: {
  entry: FeedEntry;
  initialShowBooking?: boolean;
  theme: 'dark' | 'light';
  onClose: () => void;
  onBook: (barberId: string, item: { name: string; price: number }, dateTime: Date, note?: string) => Promise<void>;
  viewerProfile: UserProfile;
  onGetBarberReviews: (barberId: string) => Promise<Review[]>;
}) {
  const { barber, item: entryItem, isMock, rating, city } = entry;
  const isSelf = barber.uid === viewerProfile.uid;
  const items = isMock ? [] : (barber.portfolioItems || []);

  // Real average rating, computed from actual reviews instead of a flat hardcoded
  // number — null while loading or for mock (demo) entries with no real backing account.
  const [reviewStats, setReviewStats] = useState<{ avg: number; count: number } | null>(null);
  useEffect(() => {
    if (isMock) {
      setReviewStats(null);
      return;
    }
    let cancelled = false;
    onGetBarberReviews(barber.uid).then(reviews => {
      if (cancelled) return;
      setReviewStats(reviews.length > 0
        ? { avg: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length, count: reviews.length }
        : { avg: 0, count: 0 });
    });
    return () => { cancelled = true; };
  }, [barber.uid, isMock, onGetBarberReviews]);
  const galleryPhotos: LightboxPhoto[] = isMock
    ? PORTFOLIO_PHOTOS.map(url => ({ url, name: entryItem.name, price: entryItem.price, createdAt: entryItem.createdAt || barber.createdAt }))
    : items.map(i => ({ url: i.url, name: i.name, price: i.price, createdAt: i.createdAt || barber.createdAt }));
  const coverUrl = isMock ? entryItem.url : barber.coverUrl;
  const avatarUrl = barber.avatarUrl || (isMock ? avatarFor(barber.uid) : '');
  const bio = isMock ? MOCK_BIO_TEXT : barber.bio;

  const [showBooking, setShowBooking] = useState(!!initialShowBooking);
  const [lightbox, setLightbox] = useState<{ photos: LightboxPhoto[]; index: number } | null>(null);

  const minPrice = isMock ? entryItem.price : (items.length > 0 ? Math.min(...items.map(i => i.price)) : (barber.basePrice || 80));

  // Same menu a client would see: this pro's own prestations list with prices, or the
  // single realization the viewer clicked into if they haven't configured one yet.
  const servicesForBooking: Service[] = barber.services && barber.services.length > 0
    ? barber.services.map(s => ({ ...s, category: '' }))
    : [{ id: 'entry', name: entryItem.name, price: entryItem.price, duration: 30, category: entryItem.category || '' }];

  const handleBookingModalBook = async (serviceId: string, serviceName: string, dateTime: Date, totalPrice: number) => {
    await onBook(barber.uid, { name: serviceName, price: totalPrice }, dateTime);
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-xl border text-left max-h-[85vh] overflow-y-auto ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200'}`}
      >
        <div className="relative h-32 md:h-40 bg-gradient-to-br from-mid-brown to-black">
          <button
            onClick={() => coverUrl && setLightbox({ photos: [{ url: coverUrl }], index: 0 })}
            className="absolute inset-0 w-full h-full block"
          >
            {coverUrl && <img src={coverUrl} className="w-full h-full object-cover" alt="" />}
            <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'dark' ? 'from-mid-brown via-mid-brown/10' : 'from-white via-white/10'} to-transparent`} />
          </button>
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 z-10"><X size={16} /></button>
        </div>

        <div className="p-6 -mt-12 relative">
          <div className="flex gap-5 items-end mb-6">
            <button
              onClick={() => avatarUrl && setLightbox({ photos: [{ url: avatarUrl }], index: 0 })}
              className={`w-24 h-24 rounded-full border-4 shrink-0 bg-gold flex items-center justify-center overflow-hidden shadow-xl ${theme === 'dark' ? 'border-mid-brown' : 'border-white'}`}
            >
              {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="" /> : <span className="font-bebas text-3xl text-black">{barber.firstName[0]}{barber.lastName[0]}</span>}
            </button>
            <div className="flex-1 pb-1 min-w-0">
              <h3 className={`text-2xl font-bebas tracking-wider mb-1 uppercase flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {barber.firstName} {barber.lastName}
                {barber.kycStatus === 'verified' && <BadgeCheck size={18} className="text-gold shrink-0" />}
              </h3>
              <p className="text-gold text-xs uppercase tracking-widest font-bold mb-1">
                {barber.gender === 'femme' ? 'Professionnelle Beauté' : 'Professionnel Beauté'}
                {barber.ageRange && ` · ${barber.ageRange} ans`}
              </p>
              <p className="text-warm-gray text-[10px] uppercase tracking-widest flex items-center gap-1">
                <MapPin size={10} /> {city}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { val: '5+', label: 'Ans' },
              isMock ? { val: '1k+', label: 'Clients' } : { val: `${barber.completedCount || 0}`, label: 'Clients' },
              isMock
                ? { val: `${rating}★`, label: 'Note' }
                : { val: reviewStats && reviewStats.count > 0 ? `${reviewStats.avg.toFixed(1)}★` : 'Nouveau', label: reviewStats && reviewStats.count > 0 ? `${reviewStats.count} avis` : 'Note' },
              { val: `${minPrice} DH`, label: 'Dès' }
            ].map((stat, i) => (
              <div key={i} className={`text-center p-2 rounded-sm border ${theme === 'dark' ? 'bg-black/20 border-gold/10' : 'bg-gray-50 border-gray-200'}`}>
                <div className="text-gold font-bebas text-lg leading-none">{stat.val}</div>
                <div className="text-[8px] text-warm-gray uppercase font-bold">{stat.label}</div>
              </div>
            ))}
          </div>

          {bio && (
            <div className="mb-6">
              <div className="text-[10px] text-warm-gray uppercase tracking-widest font-bold mb-2">À propos</div>
              <p className="text-xs text-warm-gray leading-relaxed">{bio}</p>
            </div>
          )}

          {isSelf ? (
            <div className={`p-4 rounded-lg text-center text-xs font-bold uppercase tracking-widest mb-6 ${theme === 'dark' ? 'bg-black/30 text-warm-gray' : 'bg-gray-100 text-gray-400'}`}>
              Votre post
            </div>
          ) : (
            <button
              onClick={() => setShowBooking(true)}
              className="w-full btn-primary py-4 mb-6 flex items-center justify-center gap-3 group"
            >
              <CalendarDays size={18} />
              <span className="uppercase font-bold tracking-[0.2em] text-[10px]">Prendre rendez-vous</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          <div className="text-lg font-bebas text-gold uppercase tracking-widest mb-3">Réalisations</div>
          {galleryPhotos.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 mb-4">
              {galleryPhotos.map((photo, i) => (
                <button
                  key={i}
                  onClick={() => setLightbox({ photos: galleryPhotos, index: i })}
                  className="relative aspect-square rounded-sm overflow-hidden border-2 border-gold/15"
                >
                  <img src={photo.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-warm-gray/50 uppercase tracking-widest text-center py-6">Aucune photo publiée pour le moment</p>
          )}
        </div>
      </motion.div>
      {!isSelf && (
        <BookingModal
          isOpen={showBooking}
          onClose={() => setShowBooking(false)}
          barber={barber}
          services={servicesForBooking}
          onBook={handleBookingModalBook}
          profile={viewerProfile}
          onGuestRegisterAndBook={async () => {}}
          theme={theme}
        />
      )}
      {lightbox && (
        <PhotoGalleryLightbox photos={lightbox.photos} initialIndex={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

// ============================================================
// TAB: MON PROFIL — cover/avatar, bio, portfolio, hours/pricing
// ============================================================
interface MyProfileTabProps {
  profile: UserProfile;
  theme: 'dark' | 'light';
  onUpdateBio: (bio: string) => Promise<void>;
  onUpdateCity: (city: string) => Promise<void>;
  onUpdateAgeRange: (ageRange: UserProfile['ageRange']) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<string | undefined>;
  onUploadCover: (file: File) => Promise<string | undefined>;
  onAddPortfolioItem: (file: File, name: string, price: number, category?: string) => Promise<PortfolioItem | undefined>;
  onRemovePortfolioItem: (item: PortfolioItem) => Promise<void>;
  onUpdateAvailability: (updates: Partial<Pick<UserProfile, 'workingDays' | 'workStartHour' | 'workEndHour' | 'basePrice' | 'nightEnabled' | 'nightStartHour' | 'nightPrice'>>) => Promise<void>;
  onUpdateCategories: (categories: string[]) => Promise<void>;
  onUpdateServices: (services: BarberService[]) => Promise<void>;
}

const AGE_RANGES: NonNullable<UserProfile['ageRange']>[] = ['18-25', '26-35', '36-45', '46-55', '56+'];

function MyProfileTab({ profile, theme, onUpdateBio, onUpdateCity, onUpdateAgeRange, onUploadAvatar, onUploadCover, onAddPortfolioItem, onRemovePortfolioItem, onUpdateAvailability, onUpdateCategories, onUpdateServices }: MyProfileTabProps) {
  const [bio, setBio] = useState(profile.bio || '');
  const [savingBio, setSavingBio] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(!profile.bio);
  const [savingAgeRange, setSavingAgeRange] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ photos: LightboxPhoto[]; index: number } | null>(null);

  const [city, setCity] = useState(profile.city || 'Casablanca');
  const [savingCity, setSavingCity] = useState(false);
  const moroccanCities = useMemo(() => Object.keys(CITY_COORDS).sort(), []);

  const [categories, setCategories] = useState<string[]>(profile.categories ?? []);
  const [savingCategories, setSavingCategories] = useState(false);
  const [isEditingCategories, setIsEditingCategories] = useState((profile.categories ?? []).length === 0);
  const [showCustomSpecialtyInput, setShowCustomSpecialtyInput] = useState(false);
  const [customSpecialtyInput, setCustomSpecialtyInput] = useState('');

  const [barberServices, setBarberServices] = useState<BarberService[]>(profile.services ?? []);
  const [savingServices, setSavingServices] = useState(false);
  const [isEditingServices, setIsEditingServices] = useState((profile.services ?? []).length === 0);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('30');

  const [newItemFile, setNewItemFile] = useState<File | null>(null);
  const [newItemPreview, setNewItemPreview] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(SERVICE_CATEGORIES[0].id);
  const [addingItem, setAddingItem] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  const [workingDays, setWorkingDays] = useState<number[]>(profile.workingDays ?? [1, 2, 3, 4, 5, 6]);
  const [workStartHour, setWorkStartHour] = useState(profile.workStartHour ?? 9);
  const [workEndHour, setWorkEndHour] = useState(profile.workEndHour ?? 20);
  const [basePrice, setBasePrice] = useState(profile.basePrice?.toString() ?? '30');
  const [nightEnabled, setNightEnabled] = useState(profile.nightEnabled ?? false);
  const [nightStartHour, setNightStartHour] = useState(profile.nightStartHour ?? 22);
  const [nightPrice, setNightPrice] = useState(profile.nightPrice?.toString() ?? '50');
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [isEditingAvailability, setIsEditingAvailability] = useState(
    profile.workingDays === undefined && profile.basePrice === undefined
  );

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const itemInputRef = useRef<HTMLInputElement>(null);

  const availabilityDirty =
    JSON.stringify([...workingDays].sort()) !== JSON.stringify([...(profile.workingDays ?? [1, 2, 3, 4, 5, 6])].sort()) ||
    workStartHour !== (profile.workStartHour ?? 9) ||
    workEndHour !== (profile.workEndHour ?? 20) ||
    basePrice !== (profile.basePrice?.toString() ?? '30') ||
    nightEnabled !== (profile.nightEnabled ?? false) ||
    nightStartHour !== (profile.nightStartHour ?? 22) ||
    nightPrice !== (profile.nightPrice?.toString() ?? '50');

  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      await onUpdateBio(bio.trim());
      setIsEditingBio(false);
    } catch {
      setError("Impossible d'enregistrer la bio pour le moment.");
    }
    setSavingBio(false);
  };

  const handleCancelEditBio = () => {
    setBio(profile.bio || '');
    setIsEditingBio(false);
  };

  const handleChangeCity = async (nextCity: string) => {
    setCity(nextCity);
    setSavingCity(true);
    try {
      await onUpdateCity(nextCity);
    } catch {
      setError("Impossible d'enregistrer la ville pour le moment.");
    }
    setSavingCity(false);
  };

  const handleChangeAgeRange = async (next: string) => {
    setSavingAgeRange(true);
    try {
      await onUpdateAgeRange(next ? (next as UserProfile['ageRange']) : undefined);
    } catch {
      setError("Impossible d'enregistrer la tranche d'âge pour le moment.");
    }
    setSavingAgeRange(false);
  };

  const handleAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploadingAvatar(true);
    try {
      await onUploadAvatar(file);
    } catch {
      setError("L'envoi de la photo de profil a échoué.");
    }
    setUploadingAvatar(false);
  };

  const handleCoverSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploadingCover(true);
    try {
      await onUploadCover(file);
    } catch {
      setError("L'envoi de la photo de couverture a échoué.");
    }
    setUploadingCover(false);
  };

  const handleItemFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setNewItemFile(file);
    setNewItemPreview(URL.createObjectURL(file));
  };

  const handleAddItem = async () => {
    if (!newItemFile || !newItemName.trim() || !newItemPrice) return;
    setAddingItem(true);
    setError(null);
    try {
      await onAddPortfolioItem(newItemFile, newItemName.trim(), Number(newItemPrice), newItemCategory);
      setNewItemFile(null);
      setNewItemPreview(null);
      setNewItemName('');
      setNewItemPrice('');
    } catch {
      setError("L'ajout de la réalisation a échoué. Vérifiez que Firebase Storage est bien activé.");
    }
    setAddingItem(false);
  };

  const toggleCategory = (id: string) => {
    setCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const knownCategoryIds = new Set(SERVICE_CATEGORIES.map(c => c.id));
  const customSpecialties = categories.filter(c => !knownCategoryIds.has(c));

  const addCustomSpecialty = () => {
    const word = customSpecialtyInput.trim();
    if (!word || categories.includes(word)) {
      setCustomSpecialtyInput('');
      return;
    }
    setCategories(prev => [...prev, word]);
    setCustomSpecialtyInput('');
  };

  const removeCustomSpecialty = (word: string) => {
    setCategories(prev => prev.filter(c => c !== word));
  };

  const categoriesDirty = JSON.stringify([...categories].sort()) !== JSON.stringify([...(profile.categories ?? [])].sort());

  const handleSaveCategories = async () => {
    setSavingCategories(true);
    try {
      await onUpdateCategories(categories);
      setIsEditingCategories(false);
      setShowCustomSpecialtyInput(false);
    } catch {
      setError("Impossible d'enregistrer les catégories pour le moment.");
    }
    setSavingCategories(false);
  };

  const handleCancelEditCategories = () => {
    setCategories(profile.categories ?? []);
    setCustomSpecialtyInput('');
    setShowCustomSpecialtyInput(false);
    setIsEditingCategories(false);
  };

  const addBarberService = () => {
    if (!newServiceName.trim() || !newServicePrice) return;
    const service: BarberService = {
      id: `${Date.now()}`,
      name: newServiceName.trim(),
      price: Number(newServicePrice) || 0,
      duration: Number(newServiceDuration) || 30,
    };
    setBarberServices(prev => [...prev, service]);
    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceDuration('30');
  };

  const removeBarberService = (id: string) => {
    setBarberServices(prev => prev.filter(s => s.id !== id));
  };

  const servicesDirty = JSON.stringify(barberServices) !== JSON.stringify(profile.services ?? []);

  const handleSaveServices = async () => {
    setSavingServices(true);
    try {
      await onUpdateServices(barberServices);
      setIsEditingServices(false);
    } catch {
      setError("Impossible d'enregistrer vos prestations pour le moment.");
    }
    setSavingServices(false);
  };

  const handleCancelEditServices = () => {
    setBarberServices(profile.services ?? []);
    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceDuration('30');
    setIsEditingServices(false);
  };

  const handleDeleteItem = async (item: PortfolioItem) => {
    setDeletingUrl(item.url);
    try {
      await onRemovePortfolioItem(item);
    } catch {
      setError('Impossible de supprimer cette réalisation pour le moment.');
    }
    setDeletingUrl(null);
  };

  const toggleDay = (day: number) => {
    setWorkingDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const handleSaveAvailability = async () => {
    setSavingAvailability(true);
    try {
      await onUpdateAvailability({
        workingDays,
        workStartHour,
        workEndHour,
        basePrice: Number(basePrice) || 0,
        nightEnabled,
        nightStartHour,
        nightPrice: Number(nightPrice) || 0
      });
      setIsEditingAvailability(false);
    } catch {
      setError("L'enregistrement des disponibilités a échoué.");
    }
    setSavingAvailability(false);
  };

  const handleCancelEditAvailability = () => {
    setWorkingDays(profile.workingDays ?? [1, 2, 3, 4, 5, 6]);
    setWorkStartHour(profile.workStartHour ?? 9);
    setWorkEndHour(profile.workEndHour ?? 20);
    setBasePrice(profile.basePrice?.toString() ?? '30');
    setNightEnabled(profile.nightEnabled ?? false);
    setNightStartHour(profile.nightStartHour ?? 22);
    setNightPrice(profile.nightPrice?.toString() ?? '50');
    setIsEditingAvailability(false);
  };

  const sectionLabel = `text-[10px] uppercase font-bold tracking-widest mb-3 ${theme === 'dark' ? 'text-gold/80' : 'text-gold'}`;
  const cardClass = `p-5 rounded-xl border ${theme === 'dark' ? 'bg-mid-brown/40 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`;

  return (
    <div className="text-left -mx-4 md:-mx-6 -mt-4 md:-mt-6">
      {/* COVER */}
      <div className="relative h-40 md:h-52 bg-gradient-to-br from-mid-brown to-black overflow-hidden">
        {profile.coverUrl && (
          <button onClick={() => setLightbox({ photos: [{ url: profile.coverUrl! }], index: 0 })} className="absolute inset-0 w-full h-full block">
            <img src={profile.coverUrl} className="w-full h-full object-cover" alt="" />
          </button>
        )}
        <button
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingCover}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors disabled:opacity-50"
        >
          <Camera size={16} />
        </button>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelected} />
      </div>

      <div className="px-4 md:px-6">
        {/* AVATAR */}
        <div className="relative -mt-12 mb-4">
          <div className="relative w-24 h-24">
            <button
              onClick={() => profile.avatarUrl && setLightbox({ photos: [{ url: profile.avatarUrl }], index: 0 })}
              className={`w-24 h-24 rounded-full border-4 ${theme === 'dark' ? 'border-black' : 'border-gray-50'} bg-gold flex items-center justify-center overflow-hidden shadow-xl block`}
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="font-bebas text-3xl text-black">{profile.firstName[0]}{profile.lastName[0]}</span>
              )}
            </button>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-gold text-black border-2 border-black hover:bg-gold-light transition-colors disabled:opacity-50"
            >
              <Camera size={12} />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelected} />
          </div>
        </div>

        <h2 className="font-bebas text-2xl uppercase tracking-widest">{profile.firstName} {profile.lastName}</h2>
        <p className="text-[10px] text-gold uppercase tracking-widest font-bold mb-6 flex items-center gap-1 flex-wrap justify-center">
          {profile.gender === 'femme' ? 'Professionnelle' : 'Professionnel'} ·
          <select
            value={city}
            onChange={(e) => handleChangeCity(e.target.value)}
            disabled={savingCity}
            className="bg-transparent border-none outline-none text-gold uppercase tracking-widest font-bold text-[10px] cursor-pointer disabled:opacity-50"
          >
            {moroccanCities.map(c => (
              <option key={c} value={c} className={theme === 'dark' ? 'bg-mid-brown' : ''}>{c}</option>
            ))}
          </select>
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">{error}</div>
        )}

        {/* AGE RANGE — editable here, shown publicly on the profile clients/other pros consult */}
        <section className="mb-6">
          <p className={sectionLabel}>Tranche d'âge</p>
          <div className={cardClass}>
            <select
              value={profile.ageRange || ''}
              onChange={(e) => handleChangeAgeRange(e.target.value)}
              disabled={savingAgeRange}
              className={`w-full text-xs p-3 rounded-lg border outline-none disabled:opacity-50 ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            >
              <option value="" className={theme === 'dark' ? 'bg-mid-brown' : ''}>Préférer ne pas préciser</option>
              {AGE_RANGES.map(a => (
                <option key={a} value={a} className={theme === 'dark' ? 'bg-mid-brown' : ''}>{a} ans</option>
              ))}
            </select>
          </div>
        </section>

        {/* BIO */}
        <section className="mb-6">
          <p className={sectionLabel}>Ma présentation</p>
          <div className={cardClass}>
            {isEditingBio ? (
              <>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder="Décrivez votre spécialité, votre expérience, votre style..."
                  className={`w-full text-xs p-3 rounded-lg border outline-none resize-none ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
                <div className="flex justify-between items-center mt-3">
                  <span className="text-[9px] text-warm-gray/50">{bio.length}/500</span>
                  <div className="flex items-center gap-3">
                    {profile.bio && (
                      <button
                        onClick={handleCancelEditBio}
                        className="text-[9px] text-warm-gray uppercase tracking-widest font-bold hover:text-gold transition-colors"
                      >
                        Annuler
                      </button>
                    )}
                    <button
                      onClick={handleSaveBio}
                      disabled={savingBio || !bio.trim() || bio === (profile.bio || '')}
                      className="px-4 py-1.5 bg-gold text-black text-[9px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                    >
                      {savingBio ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button onClick={() => setIsEditingBio(true)} className="w-full text-left">
                <p className="text-xs text-warm-gray leading-relaxed">{profile.bio}</p>
                <span className="mt-3 inline-block text-[9px] text-gold uppercase tracking-widest font-bold hover:underline">Modifier</span>
              </button>
            )}
          </div>
        </section>

        {/* SERVICE CATEGORIES */}
        <section className="mb-6">
          <p className={sectionLabel}>Catégories de prestations</p>
          <div className={cardClass}>
            {isEditingCategories ? (
              <>
                <p className="text-xs text-warm-gray mb-3">Sélectionnez les prestations que vous proposez — vos réalisations apparaîtront dans ces catégories côté clients.</p>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const active = categories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
                          active ? 'bg-gold border-gold text-black' : theme === 'dark' ? 'border-white/10 text-warm-gray hover:border-gold/30' : 'border-gray-200 text-gray-500 hover:border-gold/30'
                        }`}
                      >
                        <Icon size={12} />
                        {cat.label}
                      </button>
                    );
                  })}
                  {customSpecialties.map(word => (
                    <button
                      key={word}
                      onClick={() => removeCustomSpecialty(word)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border bg-gold border-gold text-black text-[10px] font-bold uppercase tracking-widest transition-colors"
                    >
                      {word}
                      <X size={12} />
                    </button>
                  ))}
                  <button
                    onClick={() => setShowCustomSpecialtyInput(true)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-dashed text-[10px] font-bold uppercase tracking-widest transition-colors ${theme === 'dark' ? 'border-white/20 text-warm-gray hover:border-gold/50 hover:text-gold' : 'border-gray-300 text-gray-500 hover:border-gold/50 hover:text-gold'}`}
                  >
                    <Plus size={12} />
                    Autre
                  </button>
                </div>

                {showCustomSpecialtyInput && (
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      value={customSpecialtyInput}
                      onChange={(e) => setCustomSpecialtyInput(e.target.value.replace(/\s/g, ''))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSpecialty(); } }}
                      maxLength={20}
                      placeholder="Ex: Tatouage"
                      className={`flex-1 text-xs p-2.5 rounded-lg border outline-none ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                    <button
                      onClick={addCustomSpecialty}
                      disabled={!customSpecialtyInput.trim()}
                      className="px-4 py-2.5 bg-gold text-black text-[9px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                    >
                      Ajouter
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-4">
                  {(profile.categories ?? []).length > 0 && (
                    <button
                      onClick={handleCancelEditCategories}
                      className="py-2.5 px-4 text-[10px] text-warm-gray uppercase tracking-widest font-bold hover:text-gold transition-colors"
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    onClick={handleSaveCategories}
                    disabled={savingCategories || !categoriesDirty}
                    className="flex-1 py-2.5 bg-gold text-black text-[10px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                  >
                    {savingCategories ? 'Enregistrement...' : 'Enregistrer mes catégories'}
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => setIsEditingCategories(true)} className="w-full text-left">
                {categories.length === 0 ? (
                  <p className="text-xs text-warm-gray/60">Aucune catégorie sélectionnée.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_CATEGORIES.filter(cat => categories.includes(cat.id)).map(cat => {
                      const Icon = cat.icon;
                      return (
                        <span key={cat.id} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border bg-gold border-gold text-black text-[10px] font-bold uppercase tracking-widest">
                          <Icon size={12} />
                          {cat.label}
                        </span>
                      );
                    })}
                    {customSpecialties.map(word => (
                      <span key={word} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border bg-gold border-gold text-black text-[10px] font-bold uppercase tracking-widest">
                        {word}
                      </span>
                    ))}
                  </div>
                )}
                <span className="mt-3 inline-block text-[9px] text-gold uppercase tracking-widest font-bold hover:underline">Modifier</span>
              </button>
            )}
          </div>
        </section>

        {/* SERVICES MENU — the list of prestations with prices a client picks from when booking */}
        <section className="mb-6">
          <p className={sectionLabel}>Mes prestations</p>
          <div className={cardClass}>
            {isEditingServices ? (
              <>
                <p className="text-xs text-warm-gray mb-3">Préparez la liste des prestations que vous proposez avec leur prix — c'est ce que les clients verront pour réserver chez vous.</p>

                {barberServices.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {barberServices.map(s => (
                      <div key={s.id} className={`flex items-center justify-between p-3 rounded-sm border ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                        <div>
                          <div className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{s.name}</div>
                          <div className="text-[10px] text-warm-gray uppercase tracking-widest">{s.duration} min</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gold font-bold text-sm">{s.price} DH</span>
                          <button onClick={() => removeBarberService(s.id)} className="text-warm-gray hover:text-red-400 transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="Nom de la prestation"
                    className={`col-span-3 sm:col-span-1 p-2.5 rounded-sm border outline-none text-xs ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                  <input
                    type="number"
                    min={0}
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    placeholder="Prix (DH)"
                    className={`p-2.5 rounded-sm border outline-none text-xs ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                  <input
                    type="number"
                    min={5}
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    placeholder="Durée (min)"
                    className={`p-2.5 rounded-sm border outline-none text-xs ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                </div>
                <button
                  onClick={addBarberService}
                  disabled={!newServiceName.trim() || !newServicePrice}
                  className={`w-full mt-2 py-2.5 border border-dashed rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 ${theme === 'dark' ? 'border-white/20 text-warm-gray hover:border-gold/50 hover:text-gold' : 'border-gray-300 text-gray-500 hover:border-gold/50 hover:text-gold'}`}
                >
                  <Plus size={12} /> Ajouter une prestation
                </button>

                <div className="flex items-center gap-3 mt-4">
                  {(profile.services ?? []).length > 0 && (
                    <button
                      onClick={handleCancelEditServices}
                      className="py-2.5 px-4 text-[10px] text-warm-gray uppercase tracking-widest font-bold hover:text-gold transition-colors"
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    onClick={handleSaveServices}
                    disabled={savingServices || !servicesDirty}
                    className="flex-1 py-2.5 bg-gold text-black text-[10px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                  >
                    {savingServices ? 'Enregistrement...' : 'Enregistrer mes prestations'}
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => setIsEditingServices(true)} className="w-full text-left">
                {barberServices.length === 0 ? (
                  <p className="text-xs text-warm-gray/60">Aucune prestation configurée.</p>
                ) : (
                  <div className="space-y-2">
                    {barberServices.map(s => (
                      <div key={s.id} className="flex items-center justify-between">
                        <div>
                          <div className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{s.name}</div>
                          <div className="text-[10px] text-warm-gray uppercase tracking-widest">{s.duration} min</div>
                        </div>
                        <span className="text-gold font-bold text-sm">{s.price} DH</span>
                      </div>
                    ))}
                  </div>
                )}
                <span className="mt-3 inline-block text-[9px] text-gold uppercase tracking-widest font-bold hover:underline">Modifier</span>
              </button>
            )}
          </div>
        </section>

        {/* AVAILABILITY & PRICING */}
        <section className="mb-6">
          <p className={sectionLabel}>Disponibilités &amp; tarifs</p>
          <div className={`${cardClass} ${isEditingAvailability ? 'space-y-5' : ''}`}>
            {isEditingAvailability ? (
              <>
                <div>
                  <span className="text-[9px] text-warm-gray uppercase font-bold block mb-2">Jours travaillés</span>
                  <div className="flex flex-wrap gap-2">
                    {DAY_LABELS.map((label, day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`w-11 h-9 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          workingDays.includes(day) ? 'bg-gold text-black' : `${theme === 'dark' ? 'bg-black/40 text-warm-gray' : 'bg-gray-100 text-gray-500'}`
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] text-warm-gray uppercase font-bold block mb-1">Heure d'ouverture</span>
                    <select
                      value={workStartHour}
                      onChange={(e) => setWorkStartHour(Number(e.target.value))}
                      className={`w-full px-3 py-2 rounded-lg text-xs outline-none border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    >
                      {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}h00</option>)}
                    </select>
                  </div>
                  <div>
                    <span className="text-[9px] text-warm-gray uppercase font-bold block mb-1">Heure de fermeture</span>
                    <select
                      value={workEndHour}
                      onChange={(e) => setWorkEndHour(Number(e.target.value))}
                      className={`w-full px-3 py-2 rounded-lg text-xs outline-none border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    >
                      {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}h00</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-warm-gray uppercase font-bold block mb-1">Tarif de base (DH)</span>
                  <input
                    type="number"
                    min={0}
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg text-xs outline-none border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                </div>

                <div className="pt-3 border-t border-white/5">
                  <button
                    onClick={() => setNightEnabled(v => !v)}
                    className="flex items-center gap-2 mb-3"
                  >
                    <span className={`w-9 h-5 rounded-full transition-colors relative ${nightEnabled ? 'bg-gold' : theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${nightEnabled ? 'left-4.5' : 'left-0.5'}`} style={{ left: nightEnabled ? '18px' : '2px' }} />
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5"><MoonIcon size={12} className="text-gold" /> Tarif de nuit</span>
                  </button>

                  {nightEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] text-warm-gray uppercase font-bold block mb-1">À partir de</span>
                        <select
                          value={nightStartHour}
                          onChange={(e) => setNightStartHour(Number(e.target.value))}
                          className={`w-full px-3 py-2 rounded-lg text-xs outline-none border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        >
                          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}h00</option>)}
                        </select>
                      </div>
                      <div>
                        <span className="text-[9px] text-warm-gray uppercase font-bold block mb-1">Nouveau tarif (DH)</span>
                        <input
                          type="number"
                          min={0}
                          value={nightPrice}
                          onChange={(e) => setNightPrice(e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg text-xs outline-none border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {(profile.workingDays !== undefined || profile.basePrice !== undefined) && (
                    <button
                      onClick={handleCancelEditAvailability}
                      className="py-2.5 px-4 text-[10px] text-warm-gray uppercase tracking-widest font-bold hover:text-gold transition-colors"
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    onClick={handleSaveAvailability}
                    disabled={savingAvailability || !availabilityDirty}
                    className="flex-1 py-2.5 bg-gold text-black text-[10px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                  >
                    {savingAvailability ? 'Enregistrement...' : 'Enregistrer mes disponibilités'}
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => setIsEditingAvailability(true)} className="w-full text-left space-y-4">
                <div>
                  <span className="text-[9px] text-warm-gray uppercase font-bold block mb-2">Jours travaillés</span>
                  <div className="flex flex-wrap gap-2">
                    {DAY_LABELS.map((label, day) => (
                      <span
                        key={day}
                        className={`w-11 h-9 flex items-center justify-center rounded-lg text-[10px] font-bold uppercase ${
                          workingDays.includes(day) ? 'bg-gold text-black' : `${theme === 'dark' ? 'bg-black/40 text-warm-gray' : 'bg-gray-100 text-gray-500'}`
                        }`}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] text-warm-gray uppercase font-bold block mb-1">Horaires</span>
                    <span className="text-xs">{workStartHour}h00 – {workEndHour}h00</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-warm-gray uppercase font-bold block mb-1">Tarif de base</span>
                    <span className="text-xs">{basePrice} DH</span>
                  </div>
                </div>
                {nightEnabled && (
                  <div className="pt-3 border-t border-white/5">
                    <span className="text-[9px] text-warm-gray uppercase font-bold flex items-center gap-1.5 mb-1"><MoonIcon size={12} className="text-gold" /> Tarif de nuit à partir de {nightStartHour}h00</span>
                    <span className="text-xs">{nightPrice} DH</span>
                  </div>
                )}
                <span className="mt-1 inline-block text-[9px] text-gold uppercase tracking-widest font-bold hover:underline">Modifier</span>
              </button>
            )}
          </div>
        </section>

        {/* PORTFOLIO */}
        <section className="mb-8">
          <p className={sectionLabel}>Mes réalisations</p>
          <div className={cardClass}>
            <div className="p-3 rounded-lg border border-dashed border-gold/20 mb-4 space-y-3">
              <button
                onClick={() => itemInputRef.current?.click()}
                className={`w-full aspect-video rounded-lg flex items-center justify-center overflow-hidden ${theme === 'dark' ? 'bg-black/40' : 'bg-gray-100'}`}
              >
                {newItemPreview ? (
                  <img src={newItemPreview} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-warm-gray text-xs flex items-center gap-1.5"><Plus size={14} /> Choisir une photo</span>
                )}
              </button>
              <input ref={itemInputRef} type="file" accept="image/*" className="hidden" onChange={handleItemFileSelected} />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Nom de la prestation"
                  className={`px-3 py-2 rounded-lg text-xs outline-none border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                />
                <input
                  type="number"
                  min={0}
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="Prix (DH)"
                  className={`px-3 py-2 rounded-lg text-xs outline-none border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                />
              </div>
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs outline-none border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
              >
                {SERVICE_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id} className={theme === 'dark' ? 'bg-mid-brown' : ''}>{cat.label}</option>
                ))}
              </select>
              <button
                onClick={handleAddItem}
                disabled={addingItem || !newItemFile || !newItemName.trim() || !newItemPrice}
                className="w-full py-2 bg-gold text-black text-[9px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
              >
                {addingItem ? 'Publication...' : 'Publier cette réalisation'}
              </button>
            </div>

            {profile.portfolioItems && profile.portfolioItems.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {profile.portfolioItems.map((item, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gold/15 group">
                    <button
                      onClick={() => setLightbox({ photos: profile.portfolioItems!.map(p => ({ url: p.url, name: p.name, price: p.price, createdAt: p.createdAt || profile.createdAt })), index: i })}
                      className="absolute inset-0 w-full h-full"
                    >
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 p-1.5 bg-black/70 pointer-events-none">
                      <p className="text-white text-[8px] truncate">{item.name}</p>
                      <p className="text-gold text-[8px] font-bold">{item.price} DH</p>
                      {(item.createdAt || profile.createdAt) && (
                        <p className="text-white/50 text-[7px]">{formatRelativeTime(item.createdAt || profile.createdAt)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      disabled={deletingUrl === item.url}
                      className="absolute top-1 right-1 p-1.5 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-warm-gray/50 uppercase tracking-widest text-center py-6 border border-dashed border-white/10 rounded-lg">
                Aucune réalisation publiée pour le moment
              </p>
            )}
          </div>
        </section>
      </div>
      {lightbox && (
        <PhotoGalleryLightbox photos={lightbox.photos} initialIndex={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

// ============================================================
// TAB: RÉSERVATION — list + accept / propose alternate slot
// ============================================================
interface BookingsTabProps {
  appointments: Appointment[];
  theme: 'dark' | 'light';
  isBlocked: boolean;
  onUpdateStatus: (id: string, status: Appointment['status']) => Promise<void>;
  onUpdateAppointment?: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onCompleteSession: (app: Appointment) => Promise<void>;
}

function BookingsTab({ appointments, theme, isBlocked, onUpdateStatus, onUpdateAppointment, onCompleteSession }: BookingsTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [proposingId, setProposingId] = useState<string | null>(null);
  const [proposedDateTime, setProposedDateTime] = useState('');

  const sorted = useMemo(
    () => [...appointments].sort((a, b) => toDate(a.dateTime).getTime() - toDate(b.dateTime).getTime()),
    [appointments]
  );

  const hasConflict = (app: Appointment) => appointments.some(other =>
    other.id !== app.id && other.status === 'confirmed' && toDate(other.dateTime).getTime() === toDate(app.dateTime).getTime()
  );

  const genderLabel = (g?: string) => g === 'homme' ? 'Homme' : g === 'femme' ? 'Femme' : 'Non précisé';
  const genderDot = (g?: string) => g === 'homme' ? 'bg-blue-400' : g === 'femme' ? 'bg-pink-400' : 'bg-gray-400';

  const statusLabel: Record<Appointment['status'], string> = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    completed: 'Terminée',
    cancelled: 'Refusée'
  };
  const statusClass: Record<Appointment['status'], string> = {
    pending: 'bg-amber-500/10 text-amber-400',
    confirmed: 'bg-emerald-500/10 text-emerald-400',
    completed: 'bg-blue-500/10 text-blue-400',
    cancelled: 'bg-red-500/10 text-red-400'
  };

  const handleSendProposal = async (app: Appointment) => {
    if (!onUpdateAppointment || !proposedDateTime) return;
    await onUpdateAppointment(app.id, {
      negotiationStatus: 'barber_countered',
      counterDateTime: new Date(proposedDateTime)
    });
    setProposingId(null);
    setProposedDateTime('');
  };

  return (
    <div className="space-y-4 text-left">
      <div>
        <h2 className="font-bebas text-3xl tracking-widest text-gold uppercase">Réservation</h2>
        <p className="text-xs text-warm-gray">Toutes les demandes et séances de vos clients.</p>
      </div>

      {sorted.length === 0 ? (
        <div className={`p-10 text-center border border-dashed rounded-xl opacity-60 ${theme === 'dark' ? 'border-gold/20' : 'border-gray-300'}`}>
          <CalendarCheck size={28} className="mx-auto mb-3 text-gold/40" />
          <p className="text-xs uppercase tracking-widest font-bold">Aucune réservation pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(app => {
            const date = toDate(app.dateTime);
            const expanded = expandedId === app.id;
            const conflict = app.status === 'pending' && hasConflict(app);
            return (
              <div key={app.id} className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'bg-mid-brown/40 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                <button
                  onClick={() => setExpandedId(expanded ? null : app.id)}
                  className="w-full p-4 flex items-center gap-4 text-left"
                >
                  <div className={`w-12 h-12 shrink-0 flex flex-col items-center justify-center rounded-lg text-center leading-none ${theme === 'dark' ? 'bg-gold/10 text-gold' : 'bg-gray-100 text-gray-500'}`}>
                    <span className="text-[9px] uppercase font-bold">{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                    <span className="text-xl font-bebas leading-none mt-0.5">{date.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bebas tracking-widest uppercase truncate">{app.serviceName || 'Prestation'}</h4>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${statusClass[app.status]}`}>{statusLabel[app.status]}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-warm-gray uppercase font-semibold">
                      <span className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${genderDot(app.clientGender)}`} /> {genderLabel(app.clientGender)}</span>
                      <span className="flex items-center gap-1"><Clock size={10} className="text-gold" /> {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="flex items-center gap-1"><Navigation size={10} className="text-gold" /> {getDistanceKm(app.id)} km</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bebas text-gold tracking-widest">{app.totalPrice} DH</div>
                    <ChevronDown size={16} className={`ml-auto text-warm-gray transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 space-y-3 border-t border-white/5">
                        {app.clientNotes && (
                          <p className="text-xs text-warm-gray italic bg-black/10 p-2 rounded-lg border border-white/5 mt-3">"{app.clientNotes}"</p>
                        )}

                        {conflict && (
                          <p className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
                            <AlertTriangle size={12} /> Conflit avec une réservation déjà confirmée à la même heure
                          </p>
                        )}

                        {(app.negotiationStatus as string) === 'barber_countered' && (
                          <p className="text-[10px] text-amber-400 uppercase font-bold">
                            Créneau proposé au client : {app.counterDateTime ? toDate(app.counterDateTime).toLocaleString('fr-FR') : '—'}
                          </p>
                        )}

                        {app.status === 'pending' && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              disabled={isBlocked}
                              onClick={() => onUpdateStatus(app.id, 'confirmed')}
                              className="flex-1 py-2.5 bg-emerald-500 text-black text-[9.5px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                            >
                              Accepter
                            </button>
                            <button
                              disabled={isBlocked}
                              onClick={() => setProposingId(proposingId === app.id ? null : app.id)}
                              className="flex-1 py-2.5 bg-gold text-black text-[9.5px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                            >
                              Proposer un autre créneau
                            </button>
                            <button
                              onClick={() => onUpdateStatus(app.id, 'cancelled')}
                              className="flex-1 py-2.5 border border-red-500/20 text-red-400 text-[9.5px] font-bold uppercase tracking-widest rounded-lg"
                            >
                              Refuser
                            </button>
                          </div>
                        )}

                        {app.status === 'confirmed' && (
                          <button
                            onClick={() => onCompleteSession(app)}
                            className="w-full py-2.5 bg-emerald-500 text-black text-[9.5px] font-bold uppercase tracking-widest rounded-lg"
                          >
                            Marquer la séance comme terminée
                          </button>
                        )}

                        {isBlocked && app.status === 'pending' && (
                          <p className="text-[9px] text-red-400 uppercase font-bold">
                            🔒 Complétez votre téléphone et votre dossier KYC pour pouvoir répondre à cette demande.
                          </p>
                        )}

                        <AnimatePresence>
                          {proposingId === app.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                                <input
                                  type="datetime-local"
                                  value={proposedDateTime}
                                  onChange={(e) => setProposedDateTime(e.target.value)}
                                  className={`flex-1 px-3 py-2 rounded-lg text-xs outline-none border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                />
                                <button
                                  onClick={() => handleSendProposal(app)}
                                  disabled={!proposedDateTime}
                                  className="px-4 py-2 bg-gold text-black text-[9px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40 shrink-0"
                                >
                                  Envoyer la proposition
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
