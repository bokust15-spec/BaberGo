import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Scissors, CreditCard, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
import { Service, UserProfile } from '../hooks/useFirebase';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  barber: UserProfile;
  services: Service[];
  onBook: (serviceId: string, dateTime: Date, totalPrice: number, proposedPrice?: number, clientNotes?: string) => Promise<void>;
  theme: 'dark' | 'light';
}

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function BookingModal({ isOpen, onClose, barber, services, onBook, theme }: BookingModalProps) {
  const workingDays = barber.workingDays && barber.workingDays.length > 0 ? barber.workingDays : [1, 2, 3, 4, 5, 6];
  const workStartHour = barber.workStartHour ?? 9;
  const workEndHour = barber.workEndHour ?? 20;

  const getNextWorkingDate = () => {
    const d = new Date();
    for (let i = 0; i < 14; i++) {
      if (workingDays.includes(d.getDay())) return d.toISOString().split('T')[0];
      d.setDate(d.getDate() + 1);
    }
    return new Date().toISOString().split('T')[0];
  };

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getNextWorkingDate());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientNotes, setClientNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isWorkingDay = (dateStr: string) => workingDays.includes(new Date(dateStr).getDay());

  const timeSlots: string[] = [];
  for (let h = workStartHour; h < workEndHour; h++) {
    timeSlots.push(`${String(h).padStart(2, '0')}:00`);
  }

  const handleBook = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(hours, minutes, 0, 0);

      await onBook(selectedService.id, appointmentDate, selectedService.price, undefined, clientNotes);
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
  };

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    setSelectedTime('');
  };

  const resetAndClose = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedDate(getNextWorkingDate());
    setSelectedTime('');
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

                  {/* Step 2: Select Date & Time — based on the barber's real availability */}
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
                          onChange={(e) => handleDateChange(e.target.value)}
                          className={`w-full p-4 rounded-sm border outline-none font-sans text-sm focus:border-gold transition-colors ${
                            theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200'
                          }`}
                        />
                        <p className="text-[10px] text-warm-gray uppercase tracking-widest">
                          Disponible : {workingDays.slice().sort().map(d => DAY_LABELS[d]).join(', ')} · {String(workStartHour).padStart(2, '0')}h-{String(workEndHour).padStart(2, '0')}h
                        </p>
                        {!isWorkingDay(selectedDate) && (
                          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-sm text-red-400 text-xs">
                            <AlertTriangle size={14} className="shrink-0" />
                            Le coiffeur n'est pas disponible ce jour-là. Choisissez une autre date.
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-gold" />
                          <label className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Créneau horaire disponible</label>
                        </div>
                        {isWorkingDay(selectedDate) ? (
                          <div className="grid grid-cols-4 gap-2">
                            {timeSlots.map((time) => (
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
                        ) : (
                          <p className="text-xs text-warm-gray/60 italic">Sélectionnez d'abord une date disponible.</p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Recap & Confirm — fixed price set by the barber, no negotiation */}
                  {step === 3 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                       <div className="flex items-center gap-2 mb-2">
                        <CreditCard size={16} className="text-gold" />
                        <span className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Récapitulatif</span>
                      </div>

                      <div className={`p-4 rounded-sm border ${theme === 'dark' ? 'bg-black/30 border-gold/10' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="text-[9px] text-warm-gray uppercase tracking-widest font-bold mb-0.5">Prestation</div>
                            <div className={`text-base font-bold ${theme === 'dark' ? 'text-gold' : 'text-gray-900'}`}>{selectedService?.name}</div>
                          </div>
                          <div className="text-lg font-bebas text-gold tracking-widest">{selectedService?.price} DH</div>
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

                      {/* CONSIGNES */}
                      <div>
                        <label className="text-[10px] text-warm-gray uppercase font-bold mb-1.5 block">Recommandation ou consigne pour le coiffeur (optionnel)</label>
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
                        disabled={step === 1 ? !selectedService : (!isWorkingDay(selectedDate) || !selectedTime)}
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
