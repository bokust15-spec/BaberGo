import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, Scissors, MapPin, ChevronRight, Star, AlertCircle, CheckCircle2, Clock3, Phone, Navigation } from 'lucide-react';
import { Appointment, Service, UserProfile } from '../hooks/useFirebase';

interface HistoryTabProps {
  appointments: Appointment[];
  services: Service[];
  barbers: UserProfile[];
  theme: 'dark' | 'light';
  onReviewClick: (appointment: Appointment) => void;
  onCancel: (id: string) => Promise<void>;
  onUpdateAppointment?: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onAddReview?: (review: any) => Promise<void>;
}

export default function HistoryTab({ 
  appointments, 
  services, 
  barbers, 
  theme, 
  onReviewClick, 
  onCancel,
  onUpdateAppointment,
  onAddReview
}: HistoryTabProps) {
  const [activeFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [activeReviewAppId, setActiveReviewAppId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submittedReviews, setSubmittedReviews] = useState<Record<string, boolean>>({});
  const [locationTimerExtensions, setLocationTimerExtensions] = useState<Record<string, number>>({});

  const getService = (id: string) => services.find(s => s.id === id);
  const getBarber = (id: string) => barbers.find(b => b.uid === id);

  // Simulation of barber countering user propositions within 5 seconds
  useEffect(() => {
    if (!onUpdateAppointment) return;
    
    // Find appointments pending and in 'client_proposed' state
    const pendingProposals = appointments.filter(
      app => app.status === 'pending' && 
      (!app.negotiationStatus || app.negotiationStatus === 'client_proposed')
    );
    
    const timers = pendingProposals.map(app => {
      return setTimeout(async () => {
        const basePrice = app.totalPrice;
        // Barber counters with standard + 15 DH rounding to 5 DH
        const counterPrice = Math.round((basePrice + 15) / 5) * 5;
        
        await onUpdateAppointment(app.id, {
          negotiationStatus: 'barber_countered',
          counterPriceByBarber: counterPrice
        });
      }, 5000);
    });

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [appointments, onUpdateAppointment]);

  const filteredAppointments = appointments.filter(app => {
    const appDate = app.dateTime instanceof Date ? app.dateTime : app.dateTime.toDate();
    const isPast = appDate < new Date() || app.status === 'completed' || app.status === 'cancelled';
    if (activeFilter === 'upcoming') return !isPast;
    if (activeFilter === 'past') return isPast;
    return true;
  }).sort((a, b) => {
    const dateA = a.dateTime instanceof Date ? a.dateTime.getTime() : a.dateTime.toDate().getTime();
    const dateB = b.dateTime instanceof Date ? b.dateTime.getTime() : b.dateTime.toDate().getTime();
    return activeFilter === 'upcoming' ? dateA - dateB : dateB - dateA;
  });

  const getStatusInfo = (app: Appointment) => {
    if (app.status === 'pending') {
      if (app.negotiationStatus === 'barber_countered') {
        return { color: 'text-amber-400 bg-amber-400/10 border-amber-500/30', icon: <Clock3 size={11} />, label: 'Contre-Offre Reçue' };
      }
      return { color: 'text-gold bg-gold/10 border-gold/30', icon: <Clock3 size={11} />, label: 'Attente Coiffeur' };
    }
    switch (app.status) {
      case 'confirmed': return { color: 'text-green-500 bg-green-500/10 border-green-500/30', icon: <CheckCircle2 size={11} />, label: 'Confirmé' };
      case 'cancelled': return { color: 'text-red-500 bg-red-400/10 border-red-500/30', icon: <AlertCircle size={11} />, label: 'Annulé' };
      case 'completed': return { color: 'text-blue-400 bg-blue-400/10 border-blue-500/30', icon: <CheckCircle2 size={11} />, label: 'Terminé' };
      default: return { color: 'text-warm-gray bg-white/5 border-white/10', icon: <Clock size={11} />, label: app.status };
    }
  };

  const handleAcceptCounter = async (appId: string, finalPrice: number) => {
    if (!onUpdateAppointment) return;
    await onUpdateAppointment(appId, {
      status: 'confirmed',
      negotiationStatus: 'accepted',
      totalPrice: finalPrice
    });
  };

  const handleDeclineCounter = async (appId: string) => {
    if (onCancel) {
      await onCancel(appId);
    }
  };

  const handleToggleLocationShare = async (appId: string, currentVal: boolean) => {
    if (!onUpdateAppointment) return;
    await onUpdateAppointment(appId, {
      clientLocationShared: !currentVal
    });
    if (!currentVal) {
      // Clear timers or default initialization
      setLocationTimerExtensions(prev => ({ ...prev, [appId]: 45 }));
    }
  };

  const handleExtendTimer = (appId: string) => {
    setLocationTimerExtensions(prev => ({
      ...prev,
      [appId]: (prev[appId] || 45) + 15
    }));
  };

  const handleCompleteSession = async (appId: string) => {
    if (!onUpdateAppointment) return;
    await onUpdateAppointment(appId, {
      status: 'completed'
    });
  };

  const handleReviewFormSubmit = async (app: Appointment, barberUid: string) => {
    if (!onAddReview) return;
    try {
      await onAddReview({
        clientId: app.clientId,
        barberId: barberUid,
        appointmentId: app.id,
        rating,
        comment,
      });
      setSubmittedReviews(prev => ({ ...prev, [app.id]: true }));
      setActiveReviewAppId(null);
      setComment('');
      setRating(5);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent px-4 py-6">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((app) => {
              const service = getService(app.serviceId);
              const barber = getBarber(app.barberId);
              const status = getStatusInfo(app);
              const date = app.dateTime instanceof Date ? app.dateTime : app.dateTime.toDate();
              const isSimulatedBarber = app.barberId.startsWith('barber_') || app.barberId === 'dummy_barber';

              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-5 rounded-sm border relative group ${
                    theme === 'dark' ? 'bg-mid-brown border-gold/20' : 'bg-white border-gray-200'
                  }`}
                >
                  {/* Card head */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border ${status.color}`}>
                        {status.icon} {status.label}
                      </div>
                      <span className="text-[10px] text-warm-gray uppercase tracking-widest font-bold">Réf: {app.id.slice(0, 6)}</span>
                    </div>
                    <div className="text-xl font-bebas text-gold tracking-widest">
                      {app.totalPrice || service?.price} DH
                    </div>
                  </div>

                  {/* Service info */}
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-black/40 rounded-sm border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                       <UserCircle size={24} className="text-gold/50" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-lg font-bebas tracking-wider uppercase ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {service?.name || "Service Inconnu"}
                      </h4>
                      <p className="text-xs text-warm-gray font-bold uppercase tracking-widest">
                        Coiffeur: {barber?.firstName || 'Partenaire'} {barber?.lastName || 'BarberGo'}
                      </p>
                      {app.clientNotes && (
                        <p className={`text-[11px] italic mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          " {app.clientNotes} "
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Date & Time with contrast corrections */}
                  <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <Calendar size={14} className="text-gold" />
                      <div>
                        <div className="text-[8px] text-warm-gray uppercase font-bold tracking-widest">Date</div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-800 font-semibold'}`}>
                          {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock size={14} className="text-gold" />
                      <div>
                        <div className="text-[8px] text-warm-gray uppercase font-bold tracking-widest">Heure</div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-800 font-semibold'}`}>
                          {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SPECIAL INDRIVE INTERACTION CONTROLS */}
                  {app.status === 'pending' && app.negotiationStatus === 'barber_countered' && (
                    <div className="mt-5 p-4 border border-gold/30 bg-gold/5 rounded-sm space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="text-gold shrink-0 animate-bounce" size={16} />
                        <h5 className="text-[10px] uppercase font-bold tracking-widest text-gold">Contre-proposition reçue :</h5>
                      </div>
                      <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Le coiffeur propose un tarif de <strong className="text-gold">{app.counterPriceByBarber} DH</strong> à la place de votre offre initiale de {app.totalPrice} DH.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptCounter(app.id, app.counterPriceByBarber || service?.price || 120)}
                          className="flex-1 py-2 bg-gold hover:bg-gold-light text-black text-[9px] uppercase font-bold tracking-widest rounded-sm transition-all shadow-md"
                        >
                          Accepter ({app.counterPriceByBarber} DH)
                        </button>
                        <button
                          onClick={() => handleDeclineCounter(app.id)}
                          className="px-4 py-2 border border-red-500/30 hover:bg-red-500/10 text-red-400 text-[9px] uppercase font-bold tracking-widest rounded-sm transition-all"
                        >
                          Refuser
                        </button>
                      </div>
                    </div>
                  )}

                  {app.status === 'pending' && (!app.negotiationStatus || app.negotiationStatus === 'client_proposed') && (
                    <div className="mt-4 p-3 bg-black/20 border border-white/5 rounded-sm flex items-center justify-between">
                      <span className="text-[9px] text-warm-gray uppercase font-bold tracking-wider inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-gold animate-pulse"></span> Recherche en cours à Casablanca...
                      </span>
                      <span className="text-[9px] text-gold font-bold uppercase">Simulation active ({isSimulatedBarber ? "Coiffeur Virtuel" : "Direct"})</span>
                    </div>
                  )}

                  {/* LOCATION SHARE ENGINE (INDRIVE SECURE FLOW) */}
                  {app.status === 'confirmed' && (
                    <div className="mt-5 p-4 border border-white/5 bg-black/10 rounded-sm space-y-4">
                      <div className="flex justify-between items-center">
                        <h5 className="text-[10px] uppercase font-bold tracking-widest text-warm-gray inline-flex items-center gap-1">
                          <MapPin size={12} className="text-gold" /> Géolocalisation Éphémère
                        </h5>
                        <button
                          onClick={() => handleToggleLocationShare(app.id, !app.clientLocationShared)}
                          className={`px-3 py-1 text-[8px] uppercase font-bold tracking-wider rounded-full transition-all ${
                            app.clientLocationShared
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-gold text-black hover:bg-gold-light'
                          }`}
                        >
                          {app.clientLocationShared ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>
                      
                      {app.clientLocationShared ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                            <p className="text-xs text-emerald-400 font-semibold leading-none">Partage actif de votre position GPS</p>
                          </div>
                          
                          <div className="text-[10.5px] leading-relaxed text-warm-gray uppercase tracking-widest">
                            Le coiffeur consulte votre position en direct. <br />
                            Expiration dans : <strong className="text-white">{locationTimerExtensions[app.id] || 45} minutes</strong>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleExtendTimer(app.id)}
                              className="px-3 py-1.5 border border-white/10 hover:border-gold/30 text-warm-gray hover:text-white text-[8px] uppercase font-bold rounded-sm transition-all"
                            >
                              +15 MIN (Prolonger)
                            </button>
                            {barber?.phone && (
                              <a
                                href={`tel:${barber.phone}`}
                                className="px-3 py-1.5 bg-black/30 border border-white/5 hover:border-gold text-gold text-[8px] uppercase font-bold rounded-sm transition-all inline-flex items-center gap-1"
                              >
                                <Phone size={10} /> Appeler
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-warm-gray italic">
                          Le partage de position éphémère permet au coiffeur de vous localiser à Casablanca sans divulguer définitivement votre adresse.
                        </p>
                      )}

                      {/* COMPLETE BUTTON TO TRIGGER REVIEW */}
                      <button
                        onClick={() => handleCompleteSession(app.id)}
                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black text-[9px] uppercase font-bold tracking-widest rounded-sm transition-all"
                      >
                        Valider la fin de la séance
                      </button>
                    </div>
                  )}

                  {/* REVIEWS SECTION */}
                  {submittedReviews[app.id] && (
                    <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center uppercase tracking-wider font-bold rounded-sm">
                      Merci pour votre avis! Votre note de {rating} ⭐ a bien été enregistrée.
                    </div>
                  )}

                  {activeReviewAppId === app.id && (
                    <div className="mt-5 p-4 border border-gold/30 bg-gold/5 rounded-sm space-y-4">
                      <h5 className="text-[10px] uppercase font-bold tracking-widest text-gold text-center">Évaluer votre séance</h5>
                      
                      {/* Star rating selection */}
                      <div className="flex justify-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className="p-1 hover:scale-110 active:scale-95 transition-transform"
                          >
                            <Star 
                              size={24} 
                              fill={star <= rating ? "#E8C86C" : "transparent"} 
                              className={star <= rating ? "text-gold" : "text-warm-gray"} 
                            />
                          </button>
                        ))}
                      </div>

                      {/* Comment */}
                      <div>
                        <label className="text-[8px] text-warm-gray uppercase font-bold tracking-widest block mb-1">Votre commentaire</label>
                        <textarea
                          rows={2}
                          placeholder="Travail impeccable, ponctuel et très propre..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="w-full p-2 text-xs bg-black/40 border border-white/10 rounded-sm text-white focus:border-gold outline-none"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewFormSubmit(app, barber?.uid || 'anonymous')}
                          className="flex-1 py-1.5 bg-gold text-black text-[9px] uppercase font-bold tracking-widest rounded-sm"
                        >
                          Enregistrer l'avis
                        </button>
                        <button
                          onClick={() => setActiveReviewAppId(null)}
                          className="px-3 py-1.5 border border-white/5 text-[9px] uppercase font-bold text-warm-gray"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions Column */}
                  <div className="mt-6 flex gap-2">
                    {app.status === 'completed' && !submittedReviews[app.id] && activeReviewAppId !== app.id && (
                      <button 
                        onClick={() => {
                          setActiveReviewAppId(app.id);
                          setRating(5);
                          setComment('');
                        }}
                        className="flex-1 py-3 bg-gold text-black rounded-sm text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gold-light"
                      >
                        <Star size={12} fill="currentColor" /> Laisser un avis
                      </button>
                    )}
                    {app.status === 'pending' && (
                      <button 
                        onClick={() => onCancel(app.id)}
                        className={`flex-1 py-3 rounded-sm text-[9px] font-bold uppercase tracking-widest border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all`}
                      >
                        Annuler la négociation
                      </button>
                    )}
                    {app.status === 'confirmed' && (
                      <button 
                        onClick={() => onCancel(app.id)}
                        className={`flex-1 py-3 rounded-sm text-[9px] font-bold uppercase tracking-widest border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all`}
                      >
                        Annuler le rendez-vous
                      </button>
                    )}
                    <button className={`w-10 h-10 flex items-center justify-center rounded-sm border border-white/10 text-warm-gray hover:text-white transition-all`}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
               <Calendar size={48} className="text-gold mb-4" />
               <p className="text-sm uppercase tracking-widest font-bold">Aucun rendez-vous trouvé</p>
               <p className="text-[10px] uppercase tracking-[0.2em] mt-1 text-warm-gray">Le futur de votre style commence ici</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const UserCircle = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
