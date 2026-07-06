import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Search, Star, MessageSquare, Scissors, Clock, User, ChevronRight, X, Send, LogOut, CalendarDays } from 'lucide-react';
import { getBarberAssistantResponse } from '../services/geminiService';
import { UserProfile, useFirebase, Service, Appointment } from '../hooks/useFirebase';
import BookingModal from './BookingModal';
import HistoryTab from './HistoryTab';
import CreateAnnonceForm from './CreateAnnonceForm';

interface AppMVPProps {
  onLogout: () => void;
  theme: 'dark' | 'light';
  profile: UserProfile | null;
  onLogoutFirebase: () => void;
}

export default function AppMVP({ onLogout, theme, profile, onLogoutFirebase }: AppMVPProps) {
  const [activeTab, setActiveTab] = useState<'map' | 'ai' | 'history'>('map');
  const [selectedBarber, setSelectedBarber] = useState<UserProfile | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isModalAnnonceActive, setIsModalAnnonceActive] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', parts: { text: string }[] }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { 
    services, 
    barbers, 
    createAppointment, 
    getAppointments, 
    updateAppointment,
    updateAppointmentStatus,
    addReview,
    user 
  } = useFirebase();

  const filteredBarbers = useMemo(() => {
    return barbers.filter(b => 
      b.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.lastName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [barbers, searchQuery]);

  useEffect(() => {
    if (profile && !selectedBarber && activeTab === 'map') {
      const timer = setTimeout(() => setShowProfileModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  useEffect(() => {
    const fetchApps = async () => {
      if (profile) {
        const apps = await getAppointments('client');
        setAppointments(apps);
      }
    };
    fetchApps();
  }, [profile, getAppointments, activeTab]);

  const handleLogoutAll = () => {
    onLogoutFirebase();
    onLogout();
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocating(false);
        }
      );
    }
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMsg = input;
    setInput('');
    const newHistory = [...messages, { role: 'user' as const, parts: [{ text: userMsg }] }];
    setMessages(newHistory);
    
    setIsTyping(true);
    try {
      const response = await getBarberAssistantResponse(userMsg, messages);
      setMessages([...newHistory, { role: 'model' as const, parts: [{ text: response }] }]);
    } catch (e) {
      setMessages([...newHistory, { role: 'model' as const, parts: [{ text: "Désolé, je rencontre une petite difficulté technique. Peux-tu reformuler ?" }] }]);
    }
    setIsTyping(false);
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
    // Refresh history if we are there
    const apps = await getAppointments('client');
    setAppointments(apps);
  };

  const handleCancelAppointment = async (id: string) => {
    await updateAppointmentStatus(id, 'cancelled');
    const apps = await getAppointments('client');
    setAppointments(apps);
  };

  const handleQuickPrompt = (txt: string) => {
     setInput(txt);
  };

  return (
    <div className={`h-screen flex flex-col pt-16 font-dm-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-gray-100'}`}>
      {/* APP TOP BAR */}
      <div className={`border-b pl-4 pr-4 py-3 flex items-center justify-between z-40 transition-colors duration-300 ${theme === 'dark' ? 'bg-mid-brown border-gold/20' : 'bg-white border-gray-200 shadow-sm'}`}>
         <div className="font-bebas text-xl text-gold tracking-widest shrink-0">Barber<span className={theme === 'dark' ? 'text-white' : 'text-black'}>Go</span></div>
         <div className={`flex p-1 rounded-sm border transition-colors ml-4 ${theme === 'dark' ? 'bg-black border-gold/10' : 'bg-gray-100 border-gray-300'}`}>
            <button 
              onClick={() => setActiveTab('map')}
              className={`px-4 md:px-6 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm ${activeTab === 'map' ? 'bg-gold text-black' : 'text-warm-gray hover:text-white'}`}
            >
              Carte
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={`px-4 md:px-6 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm ${activeTab === 'ai' ? 'bg-gold text-black' : 'text-warm-gray hover:text-white'}`}
            >
              Assistant IA
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-4 md:px-6 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm ${activeTab === 'history' ? 'bg-gold text-black' : 'text-warm-gray hover:text-white'}`}
            >
              Agenda
            </button>
         </div>
         <div className="flex items-center gap-4">
           {profile && (
             <button 
               onClick={() => setShowProfileModal(true)}
               className={`p-1.5 rounded-full transition-colors flex items-center gap-2 border px-3 ${theme === 'dark' ? 'text-gold border-gold/20 hover:bg-white/10' : 'text-gold border-gray-200 hover:bg-black/5'}`}
             >
               <User size={14} />
               <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">{profile.firstName}</span>
             </button>
           )}
           <button
             onClick={handleLogoutAll}
             className="text-warm-gray hover:text-gold transition-colors p-1"
             title="Quitter l'app"
           >
             <LogOut size={16} />
           </button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: MAP + LIST */}
        <div className={`flex-[1.2] flex flex-col border-r transition-colors duration-300 ${activeTab === 'ai' && 'hidden lg:flex'} ${activeTab === 'history' && 'hidden md:flex'} ${theme === 'dark' ? 'bg-[#0a0a0a] border-gold/10' : 'bg-white border-gray-200'}`}>
           {/* SEARCH BAR */}
           <div className={`p-4 border-b ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'}`}>
              <div className={`flex items-center gap-3 px-3 py-2 rounded-sm border ${theme === 'dark' ? 'bg-mid-brown/40 border-gold/20' : 'bg-gray-50 border-gray-200'}`}>
                 <Search size={14} className="text-gold" />
                 <input 
                   type="text" 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="Rechercher un barbier..." 
                   className="bg-transparent border-none outline-none text-xs w-full text-warm-gray" 
                 />
              </div>
           </div>

           <div className={`flex-1 relative overflow-hidden ${theme === 'dark' ? 'bg-mid-brown/10' : 'bg-gray-50'}`}>
              {/* Fake Map Grid */}
              <div className={`absolute inset-0 opacity-20 pointer-events-none ${theme === 'dark' ? 'grayscale' : ''}`} style={{ backgroundImage: theme === 'dark' ? 'radial-gradient(circle, #c9a84c 1px, transparent 1px)' : 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
              
              {/* Real-time Barber Pins (using a consistent pseudo-random positioning for demo) */}
              {filteredBarbers.map((b, i) => {
                const top = `${20 + (i * 15) % 60}%`;
                const left = `${15 + (i * 25) % 70}%`;
                return (
                  <motion.button
                    key={b.uid}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    onClick={() => setSelectedBarber(b)}
                    className="absolute group transition-all"
                    style={{ top, left }}
                  >
                     <div className="relative">
                        <div className="w-8 h-8 rounded-full rounded-br-none rotate-45 flex items-center justify-center shadow-lg border-2 border-black bg-gold">
                           <span className="-rotate-45 text-xs text-black font-bold uppercase">{b.firstName[0]}</span>
                        </div>
                        <div className={`absolute left-10 top-0 border px-2 py-1 rounded-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 ${theme === 'dark' ? 'bg-black border-gold/20' : 'bg-white border-gray-200 shadow-md'}`}>
                          <div className={`text-[8px] font-bold uppercase ${theme === 'dark' ? 'text-gold' : 'text-gray-900'}`}>{b.firstName}</div>
                        </div>
                     </div>
                  </motion.button>
                );
              })}

              {/* User Position */}
              <div className="absolute top-[50%] left-[45%]">
                 <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-xl relative z-10"></div>
                 <div className="absolute -inset-4 bg-blue-500/20 rounded-full animate-ping"></div>
              </div>
           </div>

           {/* LIST SECTION */}
           <div className={`h-1/3 border-t transition-colors duration-300 overflow-y-auto ${theme === 'dark' ? 'bg-black border-gold/10' : 'bg-white border-gray-200'}`}>
              <div className={`divide-y ${theme === 'dark' ? 'divide-gold/5' : 'divide-gray-100'}`}>
                {filteredBarbers.map(b => (
                  <button 
                    key={b.uid} 
                    onClick={() => setSelectedBarber(b)}
                    className={`w-full p-4 flex gap-4 items-center hover:bg-gold/5 transition-colors text-left ${selectedBarber?.uid === b.uid ? (theme === 'dark' ? 'bg-gold/10' : 'bg-gray-50') : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bebas text-xl">{b.firstName[0]}</div>
                    <div className="flex-1">
                      <div className={`text-xs font-bold leading-none mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{b.firstName} {b.lastName}</div>
                      <div className="text-warm-gray text-[10px] uppercase truncate">{b.gender === 'homme' ? 'Expert Homme' : 'Expert Femme'}</div>
                      <div className="flex items-center gap-4 mt-1">
                         <div className="text-gold text-[10px] font-bold">4.9★</div>
                         <div className="text-warm-gray text-[9px] uppercase tracking-widest flex items-center gap-1">
                           <MapPin size={8} /> Proche
                         </div>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-warm-gray/20" />
                  </button>
                ))}
              </div>
           </div>
        </div>

        {/* RIGHT PANEL */}
        <div className={`flex-1 flex flex-col relative transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
           <AnimatePresence mode="wait">
             {activeTab === 'map' ? (
                <motion.div key="mapview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto">
                   {selectedBarber ? (
                     <div className="p-6">
                        <div className="flex gap-6 items-start mb-8">
                           <div className="w-16 h-16 rounded-full border-2 border-gold flex items-center justify-center text-2xl shrink-0 bg-gold/10 text-gold font-bebas">{selectedBarber.firstName[0]}</div>
                           <div className="flex-1">
                              <h2 className={`text-2xl font-bebas tracking-wider mb-1 uppercase ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedBarber.firstName} {selectedBarber.lastName}</h2>
                              <p className="text-gold text-xs uppercase tracking-widest font-bold mb-4">Barbe & Cheveux Expert</p>
                              <div className="grid grid-cols-4 gap-4">
                                 {[
                                   { val: '5+', label: 'Ans' },
                                   { val: '1k+', label: 'Clients' },
                                   { val: '4.9', label: 'Note' },
                                   { val: '120 DH', label: 'Dès' }
                                 ].map((stat, i) => (
                                   <div key={i} className={`text-center p-2 rounded-sm border ${theme === 'dark' ? 'bg-mid-brown/30 border-gold/10' : 'bg-gray-50 border-gray-200'}`}>
                                      <div className="text-gold font-bebas text-xl leading-none">{stat.val}</div>
                                      <div className="text-[8px] text-warm-gray uppercase font-bold">{stat.label}</div>
                                   </div>
                                 ))}
                              </div>
                           </div>
                        </div>

                        <div className="mb-8">
                          <div className="text-[10px] text-warm-gray uppercase tracking-widest font-bold mb-4">À propos</div>
                          <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                            Spécialiste du dégradé américain et de la taille de barbe traditionnelle. Plusieurs années d'expérience dans les meilleurs salons de la capitale.
                          </p>
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
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-center p-12">
                        <div className="w-16 h-16 bg-gold/5 rounded-full flex items-center justify-center text-gold/30 mb-6">
                           <MapPin size={40} />
                        </div>
                        <h3 className={`font-bebas tracking-widest text-xl mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Prêt pour un nouveau style ?</h3>
                        <p className="text-warm-gray text-xs leading-relaxed max-w-[280px]">Sélectionnez un expert sur la carte ou dans la liste pour commencer l'aventure BarberGo.</p>
                     </div>
                   )}
                </motion.div>
             ) : activeTab === 'ai' ? (
                <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex-1 flex flex-col h-full bg-transparent overflow-hidden`}>
                  <div className={`p-4 border-b flex items-center gap-3 ${theme === 'dark' ? 'bg-mid-brown/20 border-gold/10' : 'bg-white border-gray-100'}`}>
                     <div className="w-2 h-2 rounded-full bg-gold animate-pulse"></div>
                     <div className="text-[10px] text-warm-gray uppercase font-bold tracking-widest">Assistant BarberGo IA</div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     <div className={`border p-4 rounded-sm max-w-[85%] text-xs leading-relaxed ${theme === 'dark' ? 'bg-mid-brown/40 border-gold/10 text-cream' : 'bg-white border-gray-200 text-gray-800 shadow-sm'}`}>
                        Bonjour {profile?.firstName} ! 👋 Je suis votre assistant. Quel style recherchez-vous aujourd'hui ?
                     </div>
                     {messages.map((m, i) => (
                       <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`p-4 rounded-sm text-xs leading-relaxed max-w-[85%] ${m.role === 'user' ? 'bg-gold/20 border border-gold/30 text-white' : (theme === 'dark' ? 'bg-mid-brown/40 border border-white/5 text-cream' : 'bg-white border-gray-200 text-gray-800 shadow-sm')}`}>
                             {m.parts[0].text}
                          </div>
                       </div>
                     ))}
                     {isTyping && (
                       <div className="flex justify-start">
                          <div className={`border p-3 rounded-sm flex gap-1 ${theme === 'dark' ? 'bg-mid-brown/40 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                             <div className="w-1 h-1 bg-gold rounded-full animate-bounce"></div>
                             <div className="w-1 h-1 bg-gold rounded-full animate-bounce [animation-delay:0.2s]"></div>
                             <div className="w-1 h-1 bg-gold rounded-full animate-bounce [animation-delay:0.4s]"></div>
                          </div>
                       </div>
                     )}
                     <div ref={chatEndRef} />
                  </div>
                  <div className={`p-4 border-t flex gap-2 ${theme === 'dark' ? 'bg-black border-gold/20' : 'bg-white border-gray-200'}`}>
                    <input 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Comment puis-je vous aider ?"
                      className={`flex-1 border px-4 py-2 text-xs outline-none transition-all rounded-sm ${theme === 'dark' ? 'bg-mid-brown/50 border-gold/20 text-white focus:border-gold/50' : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-gold/50'}`}
                    />
                    <button onClick={handleSendMessage} disabled={isTyping} className="bg-gold text-black p-2 rounded-sm active:scale-95 transition-all disabled:opacity-50">
                      <Send size={16} />
                    </button>
                  </div>
                </motion.div>
             ) : (
                <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 h-full">
                  <HistoryTab 
                    appointments={appointments}
                    services={services}
                    barbers={barbers}
                    theme={theme}
                    onReviewClick={() => {}} // TODO
                    onCancel={handleCancelAppointment}
                    onUpdateAppointment={updateAppointment}
                    onAddReview={addReview}
                  />
                </motion.div>
             )}
           </AnimatePresence>
        </div>
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
                       // Refresh list
                       const apps = await getAppointments('client');
                       setAppointments(apps);
                     }}
                     theme={theme}
                     onSuccess={() => {
                        setShowProfileModal(false);
                        setIsModalAnnonceActive(false);
                        setActiveTab('history'); // Redirige vers l'onglet Agenda / Live Négociation!
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
