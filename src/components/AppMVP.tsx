import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Search, Scissors, Star, User, Users, ChevronRight, X, ArrowLeft, BadgeCheck, CalendarDays, Navigation } from 'lucide-react';
import { UserProfile, useFirebase } from '../hooks/useFirebase';
import { StylePost, STYLE_POSTS, avatarFor, PORTFOLIO_PHOTOS, SALON_COVER_PHOTO, mockBarberFromPost, CITY_COORDS, distanceKm } from '../data/mockBarberFeed';
import BookingModal from './BookingModal';
import CreateAnnonceForm from './CreateAnnonceForm';

interface AppMVPProps {
  onLogout: () => void;
  theme: 'dark' | 'light';
  profile: UserProfile | null;
  onLogoutFirebase: () => void;
  clientLocation?: { lat: number; lng: number } | null;
}

export default function AppMVP({ onLogout, theme, profile, onLogoutFirebase, clientLocation }: AppMVPProps) {
  const [selectedPost, setSelectedPost] = useState<StylePost | null>(null);
  const selectedBarber = selectedPost ? mockBarberFromPost(selectedPost) : null;
  const [showBooking, setShowBooking] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isModalAnnonceActive, setIsModalAnnonceActive] = useState(false);

  const [searchGender, setSearchGender] = useState<'' | 'homme' | 'femme'>('');
  const [searchDateTime, setSearchDateTime] = useState('');
  const dateTimeInputRef = useRef<HTMLInputElement>(null);
  const [searchStyle, setSearchStyle] = useState('');

  const { services, barbers, createAppointment, user } = useFirebase();

  // Distance between the client and a barber's city, only computed once the client has
  // shared their location (via "Trouver un coiffeur autour de moi").
  const getDistance = (city: string) => {
    if (!clientLocation) return null;
    const coord = CITY_COORDS[city];
    if (!coord) return null;
    return distanceKm(clientLocation.lat, clientLocation.lng, coord.lat, coord.lng);
  };

  const filteredPosts = useMemo(() => {
    const selectedDay = searchDateTime ? new Date(searchDateTime).getDay() : null;
    // Only gender and the barber's availability on the chosen day actually filter results.
    const results = STYLE_POSTS.filter(p => {
      if (searchGender && p.gender !== searchGender) return false;
      if (selectedDay !== null && !p.availableDays.includes(selectedDay)) return false;
      return true;
    });
    // The style text doesn't exclude anyone — it just brings barbers who have already
    // done that look to the top, as a recommendation.
    const style = searchStyle.trim().toLowerCase();
    if (!style) return results;
    return [...results].sort((a, b) => {
      const aMatch = a.style.toLowerCase().includes(style) ? 0 : 1;
      const bMatch = b.style.toLowerCase().includes(style) ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [searchGender, searchDateTime, searchStyle]);

  useEffect(() => {
    if (profile && !selectedPost) {
      const timer = setTimeout(() => setShowProfileModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [profile, selectedPost]);

  const handleLogoutAll = () => {
    onLogoutFirebase();
    onLogout();
  };

  const handleSearch = () => {
    document.getElementById('style-gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openPost = (post: StylePost) => {
    setSelectedPost(post);
  };

  const quickBook = (post: StylePost) => {
    setSelectedPost(post);
    setShowBooking(true);
  };

  const handleBook = async (serviceId: string, dateTime: Date, totalPrice: number, proposedPrice?: number, clientNotes?: string) => {
    if (!selectedBarber || !user) return;
    await createAppointment({
      clientId: user.uid,
      barberId: selectedBarber.uid,
      serviceId,
      dateTime,
      totalPrice,
      proposedPrice,
      negotiationStatus: 'client_proposed',
      clientNotes
    });
  };

  return (
    <div className={`h-screen flex flex-col pt-16 font-dm-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-gray-100'}`}>
      {/* APP TOP BAR */}
      <div className={`border-b px-4 py-3 flex items-center z-40 transition-colors duration-300 ${theme === 'dark' ? 'bg-mid-brown border-gold/20' : 'bg-white border-gray-200 shadow-sm'}`}>
         <button
           onClick={onLogout}
           className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border transition-colors text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'border-white/10 text-warm-gray hover:text-gold hover:border-gold/30' : 'border-gray-200 text-gray-500 hover:text-gold hover:border-gold/30'}`}
         >
           <ArrowLeft size={14} />
           Retour
         </button>
      </div>

      <div className={`flex-1 overflow-y-auto transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'}`}>
        <AnimatePresence mode="wait">
          {selectedBarber ? (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
              <div className="p-4">
                <button
                  onClick={() => setSelectedPost(null)}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold hover:opacity-80 transition-opacity"
                >
                  <ArrowLeft size={14} /> Retour à la recherche
                </button>
              </div>

              {/* COVER */}
              <div className="h-32 md:h-40 w-full relative overflow-hidden">
                 <img src={selectedPost?.photo || SALON_COVER_PHOTO} alt="" className="w-full h-full object-cover" />
                 <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'dark' ? 'from-black via-black/20' : 'from-white via-white/10'} to-transparent`} />
              </div>

              <div className="p-6 -mt-12 relative">
                 <div className="flex gap-5 items-end mb-6">
                    <img
                      src={avatarFor(selectedBarber.uid)}
                      alt={selectedBarber.firstName}
                      className={`w-24 h-24 rounded-full object-cover shadow-xl border-4 shrink-0 ${theme === 'dark' ? 'border-black' : 'border-white'}`}
                    />
                    <div className="flex-1 pb-1">
                       <h2 className={`text-2xl font-bebas tracking-wider mb-1 uppercase flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                         {selectedBarber.firstName} {selectedBarber.lastName}
                         <BadgeCheck size={18} className="text-gold" />
                       </h2>
                       <p className="text-gold text-xs uppercase tracking-widest font-bold mb-1">Barbe & Cheveux Expert</p>
                       <p className="text-warm-gray text-[10px] uppercase tracking-widest flex items-center gap-1">
                         <MapPin size={10} /> {selectedPost?.city || 'Casablanca'}
                       </p>
                    </div>
                 </div>

                 <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                      selectedPost && getDistance(selectedPost.city) !== null
                        ? { val: `${getDistance(selectedPost.city)} km`, label: 'Distance' }
                        : { val: '5+', label: 'Ans' },
                      { val: '1k+', label: 'Clients' },
                      { val: `${selectedPost?.rating ?? '4.9'}★`, label: 'Note' },
                      { val: `${selectedPost?.priceFrom ?? '80'} DH`, label: 'Dès' }
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
                     Spécialiste du dégradé américain et de la taille de barbe traditionnelle. Plusieurs années d'expérience dans les meilleurs salons de la capitale.
                   </p>
                 </div>

                 <div className="mb-8">
                   <div className="text-[10px] text-warm-gray uppercase tracking-widest font-bold mb-4">Réalisations</div>
                   <div className="grid grid-cols-4 gap-2">
                     {PORTFOLIO_PHOTOS.map((src, i) => (
                       <div key={i} className="aspect-square rounded-sm overflow-hidden border border-gold/15">
                         <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                       </div>
                     ))}
                   </div>
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
                <h1 className={`font-bebas text-3xl md:text-4xl tracking-wide uppercase mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Trouvez votre coiffeur</h1>
                <p className="text-warm-gray text-sm">Recherchez selon la disponibilité, le genre et le style que vous voulez.</p>
              </div>

              {/* BOOKING-STYLE SEARCH BAR */}
              <div className={`flex flex-col md:flex-row rounded-lg md:rounded-full border-2 border-gold overflow-hidden shadow-lg mb-3 ${theme === 'dark' ? 'bg-mid-brown' : 'bg-white'}`}>
                 <div className={`flex-1 flex items-center gap-2 px-4 py-3 border-b md:border-b-0 md:border-r ${theme === 'dark' ? 'border-gold/15' : 'border-gray-200'}`}>
                    <Users size={16} className="text-gold shrink-0" />
                    <select
                      value={searchGender}
                      onChange={(e) => setSearchGender(e.target.value as '' | 'homme' | 'femme')}
                      className={`bg-transparent border-none outline-none text-xs w-full ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                    >
                      <option value="" className={theme === 'dark' ? 'bg-mid-brown' : ''}>Un coiffeur ou une coiffeuse</option>
                      <option value="homme" className={theme === 'dark' ? 'bg-mid-brown' : ''}>Un coiffeur</option>
                      <option value="femme" className={theme === 'dark' ? 'bg-mid-brown' : ''}>Une coiffeuse</option>
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
                      placeholder="Style de coiffure"
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
                {filteredPosts.length} coiffeur{filteredPosts.length > 1 ? 's' : ''} disponible{filteredPosts.length > 1 ? 's' : ''}
              </p>

              {/* STYLE GALLERY */}
              <div id="style-gallery">
                <h2 className={`font-bebas text-xl tracking-widest uppercase mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Coupes réalisées par nos coiffeurs</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredPosts.map((post) => (
                    <div
                      key={post.id}
                      className={`rounded-lg overflow-hidden border ${theme === 'dark' ? 'border-gold/15 bg-mid-brown/20' : 'border-gray-200 bg-white'}`}
                    >
                      <button onClick={() => openPost(post)} className="group w-full text-left block">
                        <div className="relative aspect-square">
                          <img src={post.photo} alt={post.style} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                            <MapPin size={10} className="text-gold shrink-0" />
                            <span className="text-white text-[9px] font-bold uppercase tracking-wide">{post.city}</span>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className={`text-xs font-bold mb-1 truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{post.style}</div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <img src={avatarFor(post.id)} alt="" className="w-5 h-5 rounded-full object-cover border border-gold shrink-0" />
                            <span className="text-warm-gray text-[10px] truncate">{post.barberName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-gold text-[10px] font-bold">
                              <Star size={10} className="fill-gold" /> {post.rating}
                            </div>
                            <div className="text-warm-gray text-[10px]">Dès <span className="text-gold font-bold">{post.priceFrom} DH</span></div>
                          </div>
                          {getDistance(post.city) !== null && (
                            <div className="flex items-center gap-1 text-warm-gray text-[10px] mt-1">
                              <Navigation size={10} className="text-gold shrink-0" /> {getDistance(post.city)} km
                            </div>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => quickBook(post)}
                        className="w-full bg-gold text-black py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-gold-light transition-colors"
                      >
                        Réserver
                      </button>
                    </div>
                  ))}
                </div>
                {filteredPosts.length === 0 && (
                  <div className="text-center py-16 text-warm-gray text-xs uppercase tracking-widest">Aucun résultat pour ces critères</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
              className={`w-full ${isModalAnnonceActive ? 'max-w-lg' : 'max-w-sm'} border rounded-sm overflow-hidden transition-all duration-300 ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200 shadow-2xl'}`}
            >
               <div className="p-6 border-b border-gold/10 flex justify-between items-center bg-gold/5">
                  <h3 className="font-bebas text-xl text-gold tracking-widest uppercase">
                    {isModalAnnonceActive ? 'Nouvelle Annonce' : 'Mon Compte'}
                  </h3>
                  <button onClick={() => { setShowProfileModal(false); setIsModalAnnonceActive(false); }} className="text-warm-gray hover:text-gold transition-colors"><X size={20} /></button>
               </div>

               {isModalAnnonceActive ? (
                 <div className="p-6 space-y-4">
                   <CreateAnnonceForm
                     services={services}
                     barbers={barbers}
                     onBook={async (serviceId, dateTime, totalPrice, proposedPrice, clientNotes, targetBarberId) => {
                       if (!user) return;
                       await createAppointment({
                         clientId: user.uid,
                         clientName: profile ? `${profile.firstName} ${profile.lastName}` : 'Client Anonyme',
                         barberId: targetBarberId || 'dummy_barber',
                         serviceId,
                         dateTime,
                         totalPrice,
                         proposedPrice,
                         negotiationStatus: 'client_proposed',
                         clientNotes
                       });
                     }}
                     theme={theme}
                     onSuccess={() => {
                        setShowProfileModal(false);
                        setIsModalAnnonceActive(false);
                     }}
                   />
                   <button
                     onClick={() => setIsModalAnnonceActive(false)}
                     className="w-full text-center text-[10px] uppercase font-bold text-gold/60 hover:text-gold tracking-wider transition-colors"
                   >
                     ← Retour aux détails du compte
                   </button>
                 </div>
               ) : (
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

                       {profile.role === 'client' && (
                         <button
                           onClick={() => setIsModalAnnonceActive(true)}
                           className="w-full btn-primary py-4 uppercase font-bold tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 group mt-2"
                         >
                            ⚡ Poster une Annonce (InDrive)
                         </button>
                       )}
                    </div>
                    <button
                      onClick={handleLogoutAll}
                      className="w-full py-4 border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all rounded-sm text-[10px] font-bold uppercase tracking-widest"
                    >
                      Déconnexion
                    </button>
                 </div>
               )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
