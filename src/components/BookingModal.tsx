import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Scissors, CreditCard, CheckCircle2, ChevronRight } from 'lucide-react';
import { Service, UserProfile } from '../hooks/useFirebase';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  barber: UserProfile;
  services: Service[];
  onBook: (serviceId: string, dateTime: Date, totalPrice: number, proposedPrice?: number, clientNotes?: string) => Promise<void>;
  theme: 'dark' | 'light';
}

export default function BookingModal({ isOpen, onClose, barber, services, onBook, theme }: BookingModalProps) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [proposedPrice, setProposedPrice] = useState<number>(0);
  const [clientNotes, setClientNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  const handleBook = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    
    setIsSubmitting(true);
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(hours, minutes, 0, 0);
      
      const finalPrice = proposedPrice > 0 ? proposedPrice : selectedService.price;
      await onBook(selectedService.id, appointmentDate, finalPrice, finalPrice, clientNotes);
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setProposedPrice(service.price);
  };

  const resetAndClose = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedTime('');
    setProposedPrice(0);
    setClientNotes('');
    setIsSuccess(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`w-full max-w-lg rounded-sm border overflow-hidden shadow-2xl ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200'}`}
          >
            {/* Header */}
            <div className="p-6 border-b border-gold/10 flex justify-between items-center bg-gold/5">
              <div>
                <h3 className="font-bebas text-xl text-gold tracking-widest uppercase">Réserver avec {barber.firstName}</h3>
                <p className="text-[10px] text-warm-gray uppercase tracking-widest font-bold">Étape {step} sur 3</p>
              </div>
              <button onClick={resetAndClose} className="text-warm-gray hover:text-gold transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6">
              {!isSuccess ? (
                <>
                  {/* Step 1: Select Service */}
                  {step === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Scissors size={16} className="text-gold" />
                        <span className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Choisir une prestation</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {services.map((service) => (
                          <button
                            key={service.id}
                            onClick={() => handleSelectService(service)}
                            className={`p-4 rounded-sm border text-left transition-all flex justify-between items-center group ${
                              selectedService?.id === service.id
                                ? 'border-gold bg-gold/10 ring-1 ring-gold'
                                : `border-white/5 hover:border-gold/30 ${theme === 'dark' ? 'bg-black/20' : 'bg-gray-50'}`
                            }`}
                          >
                            <div>
                              <div className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{service.name}</div>
                              <div className="text-[10px] text-warm-gray uppercase tracking-widest">{service.duration} min • {service.category}</div>
                            </div>
                            <div className="text-gold font-bold">{service.price} DH</div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Select Date & Time */}
                  {step === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gold" />
                          <label className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Date</label>
                        </div>
                        <input
                          type="date"
                          value={selectedDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className={`w-full p-4 rounded-sm border outline-none font-sans text-sm focus:border-gold transition-colors ${
                            theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200'
                          }`}
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-gold" />
                          <label className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Créneau horaire</label>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {times.map((time) => (
                            <button
                              key={time}
                              onClick={() => setSelectedTime(time)}
                              className={`py-3 rounded-sm border text-[11px] font-bold transition-all ${
                                selectedTime === time
                                  ? 'border-gold bg-gold text-black'
                                  : `border-white/5 hover:border-gold/50 ${theme === 'dark' ? 'bg-black/20 text-warm-gray' : 'bg-gray-100 text-gray-500'}`
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Recap & Confirm */}
                  {step === 3 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                       <div className="flex items-center gap-2 mb-2">
                        <CreditCard size={16} className="text-gold" />
                        <span className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Récapitulatif & Négociation</span>
                      </div>
                      
                      <div className={`p-4 rounded-sm border ${theme === 'dark' ? 'bg-black/30 border-gold/10' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="text-[9px] text-warm-gray uppercase tracking-widest font-bold mb-0.5">Prestation</div>
                            <div className={`text-base font-bold ${theme === 'dark' ? 'text-gold' : 'text-gray-900'}`}>{selectedService?.name}</div>
                          </div>
                          <div className="text-lg font-bebas text-gold tracking-widest">Tarif standard: {selectedService?.price} DH</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                          <div>
                            <div className="text-[9px] text-warm-gray uppercase tracking-widest font-bold mb-0.5">Date</div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>{new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-warm-gray uppercase tracking-widest font-bold mb-0.5">Heure</div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>{selectedTime}</div>
                          </div>
                        </div>
                      </div>

                      {/* INDRIVE NEGOTIATION */}
                      <div className={`p-5 rounded-sm border ${theme === 'dark' ? 'bg-black/50 border-gold/20' : 'bg-gold/5 border-gold/20'}`}>
                        <label className="text-[10px] text-gold uppercase font-bold tracking-widest block mb-2">Votre proposition de prix (InDrive model)</label>
                        <p className="text-[10px] text-warm-gray mb-3 italic">Proposez un prix juste. Les coiffeurs à Casablanca pourront l'accepter immédiatement ou surenchérir.</p>
                        
                        <div className="flex items-center justify-between gap-4">
                          <button 
                            type="button"
                            onClick={() => setProposedPrice(p => Math.max(10, p - 5))}
                            className="w-10 h-10 border border-gold/30 text-gold flex items-center justify-center font-bold text-lg hover:bg-gold/15 active:scale-90 rounded-sm"
                          >
                            -5
                          </button>
                          
                          <div className="flex-1 flex items-center justify-center gap-2 border-b-2 border-gold/50 pb-1 max-w-[120px]">
                            <input 
                              type="number" 
                              value={proposedPrice}
                              onChange={(e) => setProposedPrice(Math.max(1, parseInt(e.target.value) || 0))}
                              className="text-2xl font-bebas tracking-wide text-center bg-transparent outline-none w-full text-gold"
                            />
                            <span className="text-xs font-bold text-gold">DH</span>
                          </div>

                          <button 
                            type="button"
                            onClick={() => setProposedPrice(p => p + 5)}
                            className="w-10 h-10 border border-gold/30 text-gold flex items-center justify-center font-bold text-lg hover:bg-gold/15 active:scale-90 rounded-sm"
                          >
                            +5
                          </button>
                        </div>

                        <div className="flex gap-2 justify-center mt-3">
                          {[-10, 10].map((adj) => (
                            <button
                              key={adj}
                              type="button"
                              onClick={() => setProposedPrice(p => Math.max(10, p + adj))}
                              className="px-3 py-1 border border-white/5 text-[9px] uppercase font-bold hover:border-gold/30 rounded-full text-warm-gray hover:text-white"
                            >
                              {adj > 0 ? `+${adj}` : adj} DH
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* CONSIGNES */}
                      <div>
                        <label className="text-[10px] text-warm-gray uppercase font-bold mb-1.5 block">Adresse & consignes pour l'arrivée</label>
                        <textarea
                          placeholder="Ex: Résidence Al Baraka, Immeuble B, Porte 4. S'il vous plaît portez un masque..."
                          value={clientNotes}
                          onChange={(e) => setClientNotes(e.target.value)}
                          rows={2}
                          className={`w-full p-3 rounded-sm border outline-none text-xs leading-relaxed focus:border-gold transition-colors ${
                            theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-2 p-3 bg-gold/5 rounded-sm border border-gold/10">
                        <div className="w-2 h-2 rounded-full bg-gold animate-pulse"></div>
                        <p className="text-[10px] text-warm-gray italic uppercase tracking-wider">Modèle InDrive : Négociation en temps réel activée</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Actions */}
                  <div className="mt-8 flex gap-3">
                    {step > 1 && (
                      <button
                        onClick={() => setStep(step - 1)}
                        className={`flex-1 py-4 text-[10px] uppercase font-bold tracking-widest border transition-all ${
                          theme === 'dark' ? 'border-white/10 text-warm-gray hover:bg-white/5' : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        Retour
                      </button>
                    )}
                    
                    {step < 3 ? (
                      <button
                        disabled={step === 1 ? !selectedService : !selectedTime}
                        onClick={() => setStep(step + 1)}
                        className="flex-[2] btn-primary py-4 text-[10px] uppercase font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
                      >
                        Continuer <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    ) : (
                      <button
                        disabled={isSubmitting}
                        onClick={handleBook}
                        className="flex-[2] btn-primary py-4 text-[10px] uppercase font-bold tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        ) : 'Confirmer le rendez-vous'}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-10 text-center"
                >
                  <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                    <CheckCircle2 size={40} className="text-black" />
                  </div>
                  <h2 className={`text-3xl font-bebas tracking-widest uppercase mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Résreservation Validée !</h2>
                  <p className="text-warm-gray text-sm mb-8">Votre rendez-vous pour {selectedService?.name} est confirmé pour le {new Date(selectedDate).toLocaleDateString('fr-FR')} à {selectedTime}.</p>
                  <button
                    onClick={resetAndClose}
                    className="w-full btn-primary py-4 text-[10px] uppercase font-bold tracking-widest"
                  >
                    Terminer
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
