import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scissors, 
  Calendar, 
  Clock, 
  DollarSign, 
  User, 
  ChevronRight, 
  CheckCircle2, 
  MapPin, 
  Plus, 
  Minus,
  MessageSquare,
  Shield,
  Sparkles
} from 'lucide-react';
import { Service, UserProfile } from '../hooks/useFirebase';

interface CreateAnnonceFormProps {
  services: Service[];
  barbers: UserProfile[];
  onBook: (
    serviceId: string, 
    dateTime: Date, 
    totalPrice: number, 
    proposedPrice?: number, 
    clientNotes?: string,
    targetBarberId?: string
  ) => Promise<void>;
  theme: 'dark' | 'light';
  onSuccess?: () => void;
}

export default function CreateAnnonceForm({ 
  services, 
  barbers, 
  onBook, 
  theme, 
  onSuccess 
}: CreateAnnonceFormProps) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [proposedPrice, setProposedPrice] = useState<number>(0);
  const [clientNotes, setClientNotes] = useState<string>('');
  const [targetBarber, setTargetBarber] = useState<string>('dummy_barber'); // 'dummy_barber' triggers active simulation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const times = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setProposedPrice(service.price);
  };

  const handleCreateOffer = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(hours, minutes, 0, 0);

      const finalPrice = proposedPrice > 0 ? proposedPrice : selectedService.price;
      
      // Call create appointment via callback
      await onBook(
        selectedService.id, 
        appointmentDate, 
        finalPrice, 
        finalPrice, 
        clientNotes,
        targetBarber
      );
      
      setIsSuccess(true);
    } catch (e) {
      console.error("Error creating announcement offer:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedTime('');
    setProposedPrice(0);
    setClientNotes('');
    setTargetBarber('dummy_barber');
    setIsSuccess(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className={`p-6 rounded-sm border ${theme === 'dark' ? 'bg-mid-brown/40 border-gold/20 text-white' : 'bg-white border-gray-200 text-gray-900 shadow-xl'}`}>
      
      <div className="mb-6 flex justify-between items-center pb-4 border-b border-white/5">
        <div>
          <h3 className="font-bebas text-2xl text-gold tracking-widest uppercase flex items-center gap-2">
            <Sparkles className="text-gold animate-pulse" size={18} /> Poster une Annonce InDrive
          </h3>
          <p className="text-[10px] text-warm-gray uppercase tracking-widest font-bold">
            {!isSuccess ? `Étape ${step} sur 3` : 'Succès'}
          </p>
        </div>
        {!isSuccess && selectedService && (
          <span className="px-3 py-1 bg-gold/15 text-gold rounded-full text-[10px] uppercase font-bold tracking-wider">
            {selectedService.name} (Prêt)
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <div className="space-y-6">
            
            {/* STEP 1: SERVICE CHOICE */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Scissors size={14} className="text-gold" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-warm-gray">1. Choisissez la prestation de coiffure</span>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar text-left">
                  {services.map(service => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleSelectService(service)}
                      className={`p-3.5 rounded-sm border text-left transition-all flex justify-between items-center group ${
                        selectedService?.id === service.id
                          ? 'border-gold bg-gold/10 ring-1 ring-gold/40'
                          : `border-white/5 hover:border-gold/30 ${theme === 'dark' ? 'bg-black/20' : 'bg-gray-50'}`
                      }`}
                    >
                      <div>
                        <div className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{service.name}</div>
                        <div className="text-[9px] text-warm-gray uppercase tracking-widest">
                          {service.duration} min • {service.category}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gold">{service.price} DH</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 2: DATE, TIME, & TARGET BARBER */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5 text-left"
              >
                {/* Date Selection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gold" />
                    <label className="text-[10px] uppercase tracking-widest font-bold text-warm-gray">Date de l'intervention</label>
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className={`w-full p-3 text-xs rounded-sm border outline-none font-sans focus:border-gold transition-colors ${
                      theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                {/* Time select */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gold" />
                    <label className="text-[10px] uppercase tracking-widest font-bold text-warm-gray">Créneau horaire</label>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {times.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTime(t)}
                        className={`py-2 text-[10px] font-bold transition-all rounded-sm border ${
                          selectedTime === t
                            ? 'border-gold bg-gold text-black'
                            : `border-white/5 hover:border-gold/50 ${theme === 'dark' ? 'bg-black/20 text-warm-gray' : 'bg-gray-100 text-gray-500'}`
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Targeted Barber Selection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gold" />
                    <label className="text-[10px] uppercase tracking-widest font-bold text-warm-gray">Professionnel cible</label>
                  </div>
                  <select
                    value={targetBarber}
                    onChange={(e) => setTargetBarber(e.target.value)}
                    className={`w-full p-3 text-xs rounded-sm border outline-none focus:border-gold transition-colors ${
                      theme === 'dark' ? 'bg-black text-white border-white/10' : 'bg-gray-50 text-gray-900 border-gray-200'
                    }`}
                  >
                    <option value="dummy_barber">💈 Appel d'offres ouvert à tous les professionnels (Simulation active)</option>
                    {barbers.map(b => (
                      <option key={b.uid} value={b.uid}>
                        🧑‍🎨 {b.firstName} {b.lastName} (Professionnel {b.gender === 'homme' ? 'Homme' : 'Femme'})
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}

            {/* STEP 3: PRICE BIDDING & NOTES */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5 text-left"
              >
                {/* Visual recap card */}
                <div className={`p-4 rounded-sm border ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[8px] text-warm-gray font-bold uppercase tracking-wider">PRESTATION SÉLECTIONNÉE</span>
                      <h4 className="text-sm font-bold text-gold">{selectedService?.name}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] text-warm-gray font-bold uppercase tracking-wider block">TARIF DE BASE</span>
                      <strong className="text-sm text-white">{selectedService?.price} DH</strong>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-[9px] text-warm-gray border-t border-white/5 pt-2">
                    <span>📅 {new Date(selectedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    <span>⏰ {selectedTime}</span>
                    <span>👤 {targetBarber === 'dummy_barber' ? 'Appel d\'offres' : barbers.find(b => b.uid === targetBarber)?.firstName}</span>
                  </div>
                </div>

                {/* INDRIVE NEGOTIATION WIDGET */}
                <div className={`p-4 border rounded-sm ${theme === 'dark' ? 'bg-gold/5 border-gold/25' : 'bg-yellow-500/5 border-gold/20'}`}>
                  <label className="text-[10px] text-gold uppercase font-bold tracking-widest block mb-1">PROPOSEZ VOTRE TARIF (InDrive Model)</label>
                  <p className="text-[9px] text-warm-gray mb-3 leading-relaxed">
                    Ajustez votre prix à la baisse ou à la hausse. Les professionnels indépendants de Casablanca peuvent accepter l'offre ou formuler une contre-offre immédiatement.
                  </p>

                  <div className="flex items-center justify-between gap-4 max-w-[240px] mx-auto bg-black/30 p-2 border border-white/5 rounded">
                    <button
                      type="button"
                      onClick={() => setProposedPrice(p => Math.max(10, p - 5))}
                      className="w-8 h-8 rounded bg-gold/15 border border-gold/20 text-gold flex items-center justify-center font-bold text-sm hover:bg-gold hover:text-black transition-all"
                    >
                      <Minus size={12} />
                    </button>
                    <div className="flex-1 text-center flex items-center justify-center gap-1">
                      <input
                        type="number"
                        value={proposedPrice}
                        onChange={(e) => setProposedPrice(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-16 text-center text-xl font-bebas tracking-wider text-gold bg-transparent outline-none border-b border-gold/30 focus:border-gold"
                      />
                      <span className="text-xs font-bold text-gold font-mono">DH</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProposedPrice(p => p + 5)}
                      className="w-8 h-8 rounded bg-gold/15 border border-gold/20 text-gold flex items-center justify-center font-bold text-sm hover:bg-gold hover:text-black transition-all"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {/* ADRESSING AND NOTES */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-warm-gray text-[10px] font-bold uppercase tracking-widest">
                    <MapPin size={10} className="text-gold" />
                    <span>Adresse de passage & consignes</span>
                  </div>
                  <textarea
                    rows={2}
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    placeholder="Ex: Appt 12, Résidence Anfa. S'il vous plaît portez des couvre-chaussures..."
                    className={`w-full p-3 text-xs rounded-sm border outline-none font-sans focus:border-gold transition-colors ${
                      theme === 'dark' ? 'bg-black/40 border-white/10 text-white focus:bg-black/80' : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white'
                    }`}
                  />
                </div>
              </motion.div>
            )}

            {/* BUTTON NAVIGATION BAR */}
            <div className="flex gap-2.5 pt-4 border-t border-white/5">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className={`flex-1 py-3 text-[9px] uppercase font-bold tracking-widest rounded-sm border transition-colors ${
                    theme === 'dark' ? 'border-white/10 text-warm-gray hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                  }`}
                >
                  Retour
                </button>
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  disabled={(step === 1 && !selectedService) || (step === 2 && !selectedTime)}
                  onClick={() => setStep(step + 1)}
                  className="flex-[2] btn-primary py-3 text-[9px] uppercase font-bold tracking-widest rounded-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 group transition-all"
                >
                  Continuer <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCreateOffer}
                  className="flex-[2] btn-primary py-3 text-[9px] uppercase font-bold tracking-widest rounded-sm disabled:opacity-50 flex items-center justify-center gap-1 transition-all"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    '🚀 Publier mon annonce'
                  )}
                </button>
              )}
            </div>
            
          </div>
        ) : (
          /* SUCCESS PANEL */
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-6 text-center space-y-5"
          >
            <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(212,175,55,0.35)]">
              <CheckCircle2 size={32} className="text-black" />
            </div>
            <div>
              <h4 className="font-bebas text-2xl tracking-widest text-gold uppercase">Annonce En Ligne !</h4>
              <p className="text-xs text-warm-gray leading-relaxed max-w-sm mx-auto mt-1">
                Votre appel d'offres a été publié avec succès. Les professionnels disponibles à Casablanca peuvent maintenant consulter votre proposition et vous faire des offres en temps réel !
              </p>
            </div>

            <div className={`p-4 border rounded-sm max-w-xs mx-auto text-left space-y-1.5 ${theme === 'dark' ? 'bg-black/30 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-[10px] text-warm-gray font-bold uppercase">RÉCAPITULATIF :</div>
              <div className="text-xs font-semibold text-white truncate">{selectedService?.name}</div>
              <div className="text-xs text-gold font-bold">Tarif proposé : {proposedPrice} DH</div>
              <div className="text-[10px] text-warm-gray">📅 {new Date(selectedDate).toLocaleDateString('fr-FR')} à {selectedTime}</div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full btn-primary py-3 text-[9px] uppercase font-bold tracking-widest rounded-sm"
            >
              Créer une autre annonce
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
