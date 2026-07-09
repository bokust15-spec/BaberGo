import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Search, Scissors, Star, User, Users, ChevronRight, ChevronDown, X, ArrowLeft, BadgeCheck, CalendarDays, CalendarCheck, Navigation, Clock, AlertTriangle, Check } from 'lucide-react';
import { UserProfile, useFirebase, Appointment } from '../hooks/useFirebase';
import { STYLE_POSTS, avatarFor, PORTFOLIO_PHOTOS, SALON_COVER_PHOTO, mockBarberFromPost, CITY_COORDS, distanceKm } from '../data/mockBarberFeed';
import BookingModal from './BookingModal';
import CategoryRail from './CategoryRail';

// A single bookable "look": either a real barber's own uploaded realization, or one
// of the mock style-feed posts. Unified so the client search shows both the same way.
interface FeedEntry {
  barber: UserProfile;
  item: { url: string; name: string; price: number; category?: string };
  isMock: boolean;
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
  onClientBook: (barberId: string, serviceId: string, dateTime: Date, totalPrice: number, proposedPrice?: number, clientNotes?: string) => Promise<void>;
  initialCategory?: string | null;
}

export default function AppMVP({ onLogout, onLogin, theme, profile, onLogoutFirebase, clientLocation, appointments, onUpdateStatus, onUpdateAppointment, onAddReview, onClientBook, initialCategory }: AppMVPProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'bookings'>('search');
  const [selectedEntry, setSelectedEntry] = useState<FeedEntry | null>(null);
  const selectedBarber = selectedEntry?.barber ?? null;
  const [showBooking, setShowBooking] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [searchGender, setSearchGender] = useState<'' | 'homme' | 'femme'>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory ?? null);
  const [searchDateTime, setSearchDateTime] = useState('');
  const dateTimeInputRef = useRef<HTMLInputElement>(null);
  const [searchStyle, setSearchStyle] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const moroccanCities = useMemo(() => Object.keys(CITY_COORDS).sort(), []);

  const { services, barbers, user } = useFirebase();

  // Distance between the client and a barber's city, only computed once the client has
  // shared their location (via "Trouver un coiffeur autour de moi").
  const getDistance = (city: string) => {
    if (!clientLocation) return null;
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
      (b.portfolioItems || []).forEach(item => {
        real.push({
          barber: b,
          item,
          isMock: false,
          rating: 4.9,
          city: 'Casablanca',
          availableDays: b.workingDays && b.workingDays.length > 0 ? b.workingDays : [1, 2, 3, 4, 5, 6]
        });
      });
    });
    const mock: FeedEntry[] = STYLE_POSTS.map(post => ({
      barber: mockBarberFromPost(post),
      item: { url: post.photo, name: post.style, price: post.priceFrom, category: post.category },
      isMock: true,
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

  const handleLogoutAll = () => {
    onLogoutFirebase();
    onLogout();
  };

  const handleSearch = () => {
    document.getElementById('style-gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openEntry = (entry: FeedEntry) => {
    setSelectedEntry(entry);
  };

  const quickBook = (entry: FeedEntry) => {
    setSelectedEntry(entry);
    setShowBooking(true);
  };

  const handleBook = async (serviceId: string, dateTime: Date, totalPrice: number, proposedPrice?: number, clientNotes?: string) => {
    if (!selectedBarber) return;
    await onClientBook(selectedBarber.uid, serviceId, dateTime, totalPrice, proposedPrice, clientNotes);
  };

  return (
    <div className={`h-screen flex flex-col pt-16 font-dm-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-gray-100'}`}>
      {/* APP TOP BAR */}
      <div className={`border-b px-4 py-3 flex items-center justify-between z-40 transition-colors duration-300 ${theme === 'dark' ? 'bg-mid-brown border-gold/20' : 'bg-white border-gray-200 shadow-sm'}`}>
         <button
           onClick={onLogout}
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
        {activeTab === 'bookings' ? (
          <MyBookingsSection
            appointments={appointments}
            barbers={barbers}
            services={services}
            theme={theme}
            clientId={user?.uid}
            onUpdateStatus={onUpdateStatus}
            onUpdateAppointment={onUpdateAppointment}
            onAddReview={onAddReview}
          />
        ) : (
        <AnimatePresence mode="wait">
          {selectedBarber && selectedEntry ? (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
              <div className="p-4">
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold hover:opacity-80 transition-opacity"
                >
                  <ArrowLeft size={14} /> Retour à la recherche
                </button>
              </div>

              {/* COVER */}
              <div className="h-32 md:h-40 w-full relative overflow-hidden">
                 <img src={(selectedEntry.isMock ? selectedEntry.item.url : selectedBarber.coverUrl) || SALON_COVER_PHOTO} alt="" className="w-full h-full object-cover" />
                 <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'dark' ? 'from-black via-black/20' : 'from-white via-white/10'} to-transparent`} />
              </div>

              <div className="p-6 -mt-12 relative">
                 <div className="flex gap-5 items-end mb-6">
                    <img
                      src={selectedBarber.avatarUrl || avatarFor(selectedBarber.uid)}
                      alt={selectedBarber.firstName}
                      className={`w-24 h-24 rounded-full object-cover shadow-xl border-4 shrink-0 ${theme === 'dark' ? 'border-black' : 'border-white'}`}
                    />
                    <div className="flex-1 pb-1">
                       <h2 className={`text-2xl font-bebas tracking-wider mb-1 uppercase flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                         {selectedBarber.firstName} {selectedBarber.lastName}
                         <BadgeCheck size={18} className="text-gold" />
                       </h2>
                       <p className="text-gold text-xs uppercase tracking-widest font-bold mb-1">{selectedBarber.gender === 'femme' ? 'Experte Beauté' : 'Expert Beauté'}</p>
                       <p className="text-warm-gray text-[10px] uppercase tracking-widest flex items-center gap-1">
                         <MapPin size={10} /> {selectedEntry.city}
                       </p>
                    </div>
                 </div>

                 <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                      getDistance(selectedEntry.city) !== null
                        ? { val: `${getDistance(selectedEntry.city)} km`, label: 'Distance' }
                        : { val: '5+', label: 'Ans' },
                      { val: '1k+', label: 'Clients' },
                      { val: `${selectedEntry.rating}★`, label: 'Note' },
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

                 <div className="mb-8">
                   <div className="text-[10px] text-warm-gray uppercase tracking-widest font-bold mb-4">Réalisations</div>
                   <div className="grid grid-cols-4 gap-2">
                     {(selectedEntry.isMock ? PORTFOLIO_PHOTOS : (selectedBarber.portfolioItems || []).map(i => i.url)).map((src, i) => (
                       <div key={i} className="aspect-square rounded-sm overflow-hidden border border-gold/15">
                         <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                       </div>
                     ))}
                   </div>
                   {!selectedEntry.isMock && (selectedBarber.portfolioItems || []).length === 0 && (
                     <p className="text-xs text-warm-gray/50 uppercase tracking-widest text-center py-6">Aucune photo publiée pour le moment</p>
                   )}
                 </div>

                 <button
                   onClick={() => setShowBooking(true)}
                   className="w-full btn-primary py-5 mt-4 flex items-center justify-center gap-3 group"
                 >
                   <CalendarDays size={18} />
                   <span className="uppercase font-bold tracking-[0.2em]">Prendre rendez-vous</span>
                   <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto px-4 py-8 md:py-12">
              <div className="mb-6">
                <h1 className={`font-bebas text-3xl md:text-4xl tracking-wide uppercase mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Trouvez votre expert</h1>
                <p className="text-warm-gray text-sm">Recherchez selon la disponibilité, le genre et la prestation que vous voulez.</p>
              </div>

              {/* CATEGORY RAIL */}
              <CategoryRail selected={selectedCategory} onSelect={setSelectedCategory} theme={theme} />

              {/* BOOKING-STYLE SEARCH BAR */}
              <div className={`flex flex-col md:flex-row rounded-lg md:rounded-full border-2 border-gold overflow-hidden shadow-lg mb-3 ${theme === 'dark' ? 'bg-mid-brown' : 'bg-white'}`}>
                 <div className={`flex-1 flex items-center gap-2 px-4 py-3 border-b md:border-b-0 md:border-r ${theme === 'dark' ? 'border-gold/15' : 'border-gray-200'}`}>
                    <Users size={16} className="text-gold shrink-0" />
                    <select
                      value={searchGender}
                      onChange={(e) => setSearchGender(e.target.value as '' | 'homme' | 'femme')}
                      className={`bg-transparent border-none outline-none text-xs w-full ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                    >
                      <option value="" className={theme === 'dark' ? 'bg-mid-brown' : ''}>Un expert ou une experte</option>
                      <option value="homme" className={theme === 'dark' ? 'bg-mid-brown' : ''}>Un expert</option>
                      <option value="femme" className={theme === 'dark' ? 'bg-mid-brown' : ''}>Une experte</option>
                    </select>
                 </div>
                 <div className={`flex-1 flex items-center gap-2 px-4 py-3 border-b md:border-b-0 md:border-r ${theme === 'dark' ? 'border-gold/15' : 'border-gray-200'}`}>
                    <MapPin size={16} className="text-gold shrink-0" />
                    <select
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      className={`bg-transparent border-none outline-none text-xs w-full ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                    >
                      <option value="" className={theme === 'dark' ? 'bg-mid-brown' : ''}>Toutes les villes</option>
                      {moroccanCities.map(city => (
                        <option key={city} value={city} className={theme === 'dark' ? 'bg-mid-brown' : ''}>{city}</option>
                      ))}
                    </select>
                 </div>
                 <div className={`flex-1 flex items-center gap-2 px-4 py-3 border-b md:border-b-0 md:border-r ${theme === 'dark' ? 'border-gold/15' : 'border-gray-200'}`}>
                    <button
                      type="button"
                      onClick={() => dateTimeInputRef.current?.showPicker?.()}
                      className="text-gold shrink-0 hover:opacity-70 transition-opacity"
                      aria-label="Choisir la date et l'heure"
                    >
                      <CalendarDays size={24} />
                    </button>
                    <input
                      ref={dateTimeInputRef}
                      type="datetime-local"
                      value={searchDateTime}
                      onChange={(e) => setSearchDateTime(e.target.value)}
                      className={`bg-transparent border-none outline-none text-xs w-full [&::-webkit-calendar-picker-indicator]:opacity-0 ${theme === 'dark' ? 'text-white [color-scheme:dark]' : 'text-gray-900'}`}
                    />
                 </div>
                 <div className="flex-1 flex items-center gap-2 px-4 py-3">
                    <Scissors size={16} className="text-gold shrink-0" />
                    <input
                      value={searchStyle}
                      onChange={(e) => setSearchStyle(e.target.value)}
                      placeholder="Style ou prestation recherchée"
                      className={`bg-transparent border-none outline-none text-xs w-full ${theme === 'dark' ? 'text-white placeholder:text-warm-gray' : 'text-gray-900 placeholder:text-gray-400'}`}
                    />
                 </div>
                 <button
                   onClick={handleSearch}
                   className="btn-primary md:rounded-none px-8 py-4 flex items-center justify-center gap-2 shrink-0"
                 >
                   <Search size={16} />
                   Rechercher
                 </button>
              </div>
              <p className="text-warm-gray text-[10px] uppercase tracking-widest mb-10">
                {filteredEntries.length} expert{filteredEntries.length > 1 ? 's' : ''} disponible{filteredEntries.length > 1 ? 's' : ''}
              </p>

              {/* STYLE GALLERY */}
              <div id="style-gallery">
                <h2 className={`font-bebas text-xl tracking-widest uppercase mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Réalisations de nos experts</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredEntries.map((entry, i) => {
                    const avatarSrc = entry.barber.avatarUrl || avatarFor(entry.barber.uid);
                    return (
                    <div
                      key={i}
                      className={`rounded-lg overflow-hidden border ${theme === 'dark' ? 'border-gold/15 bg-mid-brown/20' : 'border-gray-200 bg-white'}`}
                    >
                      <button onClick={() => openEntry(entry)} className="group w-full text-left block">
                        <div className="relative aspect-square">
                          <img src={entry.item.url} alt={entry.item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                            <MapPin size={10} className="text-gold shrink-0" />
                            <span className="text-white text-[9px] font-bold uppercase tracking-wide">{entry.city}</span>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className={`text-xs font-bold mb-1 truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{entry.item.name}</div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <img src={avatarSrc} alt="" className="w-5 h-5 rounded-full object-cover border border-gold shrink-0" />
                            <span className="text-warm-gray text-[10px] truncate">{entry.barber.firstName} {entry.barber.lastName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-gold text-[10px] font-bold">
                              <Star size={10} className="fill-gold" /> {entry.rating}
                            </div>
                            <div className="text-warm-gray text-[10px]">Dès <span className="text-gold font-bold">{entry.item.price} DH</span></div>
                          </div>
                          {getDistance(entry.city) !== null && (
                            <div className="flex items-center gap-1 text-warm-gray text-[10px] mt-1">
                              <Navigation size={10} className="text-gold shrink-0" /> {getDistance(entry.city)} km
                            </div>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => quickBook(entry)}
                        className="w-full bg-gold text-black py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-gold-light transition-colors"
                      >
                        Réserver
                      </button>
                    </div>
                    );
                  })}
                </div>
                {filteredEntries.length === 0 && (
                  <div className="text-center py-16 text-warm-gray text-xs uppercase tracking-widest">Aucun résultat pour ces critères</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>

      {/* BOTTOM NAV */}
      <nav className={`fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-md ${theme === 'dark' ? 'bg-black/90 border-gold/20' : 'bg-white/95 border-gray-200'}`}>
        <div className="max-w-md mx-auto grid grid-cols-2">
          {([
            { id: 'search' as const, label: 'Rechercher', Icon: Search },
            { id: 'bookings' as const, label: 'Mes Réservations', Icon: CalendarCheck }
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedEntry(null); }}
              className={`flex flex-col items-center gap-1 py-3 transition-colors ${activeTab === tab.id ? 'text-gold' : 'text-warm-gray hover:text-white'}`}
            >
              <tab.Icon size={20} />
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
          services={services}
          onBook={handleBook}
          theme={theme}
        />
      )}

      {/* PROFILE MODAL */}
      <AnimatePresence>
        {showProfileModal && profile && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={`w-full max-w-sm border rounded-sm overflow-hidden transition-all duration-300 ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200 shadow-2xl'}`}
            >
               <div className="p-6 border-b border-gold/10 flex justify-between items-center bg-gold/5">
                  <h3 className="font-bebas text-xl text-gold tracking-widest uppercase">Mon Compte</h3>
                  <button onClick={() => setShowProfileModal(false)} className="text-warm-gray hover:text-gold transition-colors"><X size={20} /></button>
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

function toDate(value: any): Date {
  return value instanceof Date ? value : value.toDate();
}

// ============================================================
// TAB: MES RÉSERVATIONS — client-side booking history, response
// to barber counter-proposals (time/price), cancellation, reviews
// ============================================================
interface MyBookingsSectionProps {
  appointments: Appointment[];
  barbers: UserProfile[];
  services: { id: string; name: string }[];
  theme: 'dark' | 'light';
  clientId?: string;
  onUpdateStatus: (id: string, status: Appointment['status']) => Promise<void>;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onAddReview: (review: { clientId: string; barberId: string; appointmentId: string; rating: number; comment: string }) => Promise<void>;
}

function MyBookingsSection({ appointments, barbers, services, theme, clientId, onUpdateStatus, onUpdateAppointment, onAddReview }: MyBookingsSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [ratingDraft, setRatingDraft] = useState<Record<string, number>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [submittingReview, setSubmittingReview] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...appointments].sort((a, b) => toDate(b.dateTime).getTime() - toDate(a.dateTime).getTime()),
    [appointments]
  );

  const getServiceLabel = (app: Appointment) => app.serviceName || services.find(s => s.id === app.serviceId)?.name || 'Prestation';

  const getBarberInfo = (app: Appointment): { name: string; avatarUrl: string | null } => {
    if (app.barberId === 'dummy_barber') return { name: 'Recherche d\'un expert en cours...', avatarUrl: null };
    const real = barbers.find(b => b.uid === app.barberId);
    if (real) return { name: `${real.firstName} ${real.lastName}`, avatarUrl: real.avatarUrl || null };
    const mockPost = STYLE_POSTS.find(p => p.id === app.barberId);
    if (mockPost) return { name: mockPost.barberName, avatarUrl: avatarFor(mockPost.id) };
    return { name: 'Expert BarberGo', avatarUrl: null };
  };

  const statusLabel: Record<Appointment['status'], string> = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    completed: 'Terminée',
    cancelled: 'Annulée'
  };
  const statusClass: Record<Appointment['status'], string> = {
    pending: 'bg-amber-500/10 text-amber-400',
    confirmed: 'bg-emerald-500/10 text-emerald-400',
    completed: 'bg-blue-500/10 text-blue-400',
    cancelled: 'bg-red-500/10 text-red-400'
  };

  const hasCounter = (app: Appointment) => app.status === 'pending' && app.negotiationStatus === 'barber_countered';

  const handleAcceptCounter = async (app: Appointment) => {
    setBusyId(app.id);
    const updates: Partial<Appointment> = { status: 'confirmed', negotiationStatus: 'accepted' };
    if (app.counterDateTime) updates.dateTime = app.counterDateTime;
    if (app.counterPriceByBarber) updates.totalPrice = app.counterPriceByBarber;
    try {
      await onUpdateAppointment(app.id, updates);
    } catch (e) {
      console.error(e);
    }
    setBusyId(null);
  };

  const handleDeclineCounter = async (app: Appointment) => {
    setBusyId(app.id);
    try {
      await onUpdateAppointment(app.id, { status: 'cancelled', negotiationStatus: 'declined' });
    } catch (e) {
      console.error(e);
    }
    setBusyId(null);
  };

  const handleCancel = async (app: Appointment) => {
    setBusyId(app.id);
    try {
      await onUpdateStatus(app.id, 'cancelled');
    } catch (e) {
      console.error(e);
    }
    setBusyId(null);
  };

  const handleSubmitReview = async (app: Appointment) => {
    if (!clientId) return;
    setSubmittingReview(app.id);
    try {
      await onAddReview({
        clientId,
        barberId: app.barberId,
        appointmentId: app.id,
        rating: ratingDraft[app.id] || 5,
        comment: commentDraft[app.id] || ''
      });
      setReviewedIds(prev => new Set(prev).add(app.id));
    } catch (e) {
      console.error(e);
    }
    setSubmittingReview(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 text-left">
      <div className="mb-6">
        <h1 className={`font-bebas text-3xl md:text-4xl tracking-wide uppercase mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Mes réservations</h1>
        <p className="text-warm-gray text-sm">Suivez vos demandes, répondez aux propositions de vos experts et laissez un avis après votre séance.</p>
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
            const barberInfo = getBarberInfo(app);
            const busy = busyId === app.id;
            return (
              <div key={app.id} className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'bg-mid-brown/40 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                <button
                  onClick={() => setExpandedId(expanded ? null : app.id)}
                  className="w-full p-4 flex items-center gap-4 text-left"
                >
                  {barberInfo.avatarUrl ? (
                    <img src={barberInfo.avatarUrl} alt="" className="w-12 h-12 shrink-0 rounded-full object-cover border border-gold/30" />
                  ) : (
                    <div className={`w-12 h-12 shrink-0 flex flex-col items-center justify-center rounded-lg text-center leading-none ${theme === 'dark' ? 'bg-gold/10 text-gold' : 'bg-gray-100 text-gray-500'}`}>
                      <span className="text-[9px] uppercase font-bold">{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                      <span className="text-xl font-bebas leading-none mt-0.5">{date.getDate()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bebas tracking-widest uppercase truncate">{getServiceLabel(app)}</h4>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${statusClass[app.status]}`}>{statusLabel[app.status]}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-warm-gray uppercase font-semibold">
                      <span className="truncate">{barberInfo.name}</span>
                      <span className="flex items-center gap-1"><Clock size={10} className="text-gold" /> {date.toLocaleDateString('fr-FR')} · {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
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

                        {hasCounter(app) && (
                          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2">
                            <p className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
                              <AlertTriangle size={12} /> Votre expert propose un changement
                            </p>
                            {app.counterDateTime && (
                              <p className="text-xs text-warm-gray">Nouveau créneau : <strong className="text-white">{toDate(app.counterDateTime).toLocaleString('fr-FR')}</strong></p>
                            )}
                            {app.counterPriceByBarber && (
                              <p className="text-xs text-warm-gray">Nouveau tarif : <strong className="text-gold">{app.counterPriceByBarber} DH</strong></p>
                            )}
                            <div className="flex gap-2 pt-1">
                              <button
                                disabled={busy}
                                onClick={() => handleAcceptCounter(app)}
                                className="flex-1 py-2 bg-emerald-500 text-black text-[9.5px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40 flex items-center justify-center gap-1"
                              >
                                <Check size={12} /> Accepter
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => handleDeclineCounter(app)}
                                className="flex-1 py-2 border border-red-500/20 text-red-400 text-[9.5px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                              >
                                Refuser
                              </button>
                            </div>
                          </div>
                        )}

                        {app.status === 'pending' && !hasCounter(app) && (
                          <div className="space-y-2">
                            <p className="text-[10px] text-warm-gray uppercase font-bold">En attente de la réponse de l'expert</p>
                            <button
                              disabled={busy}
                              onClick={() => handleCancel(app)}
                              className="w-full py-2.5 border border-red-500/20 text-red-400 text-[9.5px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                            >
                              Annuler la demande
                            </button>
                          </div>
                        )}

                        {app.status === 'confirmed' && (
                          <button
                            disabled={busy}
                            onClick={() => handleCancel(app)}
                            className="w-full py-2.5 border border-red-500/20 text-red-400 text-[9.5px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                          >
                            Annuler la réservation
                          </button>
                        )}

                        {app.status === 'completed' && (
                          reviewedIds.has(app.id) ? (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center text-emerald-400 text-xs font-bold uppercase tracking-widest">
                              Merci pour votre avis !
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg border border-gold/20 bg-black/10 space-y-2">
                              <p className="text-[10px] text-warm-gray uppercase font-bold">Laisser un avis</p>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(n => (
                                  <button
                                    key={n}
                                    onClick={() => setRatingDraft(prev => ({ ...prev, [app.id]: n }))}
                                    className="p-0.5"
                                  >
                                    <Star size={18} className={n <= (ratingDraft[app.id] || 5) ? 'fill-gold text-gold' : 'text-warm-gray/30'} />
                                  </button>
                                ))}
                              </div>
                              <textarea
                                value={commentDraft[app.id] || ''}
                                onChange={(e) => setCommentDraft(prev => ({ ...prev, [app.id]: e.target.value }))}
                                rows={2}
                                placeholder="Votre expérience avec cet expert..."
                                className={`w-full px-3 py-2 rounded-lg text-xs outline-none border resize-none ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                              />
                              <button
                                disabled={submittingReview === app.id}
                                onClick={() => handleSubmitReview(app)}
                                className="w-full py-2 bg-gold text-black text-[9px] font-bold uppercase tracking-widest rounded-lg disabled:opacity-40"
                              >
                                {submittingReview === app.id ? 'Envoi...' : 'Envoyer mon avis'}
                              </button>
                            </div>
                          )
                        )}

                        {app.status === 'cancelled' && (
                          <p className="text-[10px] text-red-400 uppercase font-bold">Cette réservation a été annulée.</p>
                        )}
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
