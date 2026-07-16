import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Users, Scissors, Phone, Mail, Lock, ChevronRight, AlertTriangle } from 'lucide-react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (data: any) => Promise<void>;
  onSwitchToLogin: () => void;
  theme: 'dark' | 'light';
}

// Clients never create an account through this form — they only get one transparently
// when confirming their first booking (see onGuestRegisterAndBook). This modal is
// reserved for professionals signing up ("Je suis professionnel(le) beauté").
export default function RegisterModal({ isOpen, onClose, onRegister, onSwitchToLogin, theme }: RegisterModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'homme' as 'homme' | 'femme' | 'autre',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'barber' as 'client' | 'barber',
    ageRange: '' as '' | '18-25' | '26-35' | '36-45' | '46-55' | '56+'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ageRange, ...rest } = formData;
      await onRegister(ageRange ? { ...rest, ageRange } : rest);
    } catch (err) {
      console.error(err);
      setError("L'inscription a échoué. Vérifiez vos informations et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = `w-full border pl-10 pr-4 py-2.5 text-xs outline-none rounded-lg transition-all focus:ring-2 focus:ring-gold/30 ${
    theme === 'dark'
      ? 'bg-black/40 border-white/10 text-white focus:border-gold/60'
      : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gold/60'
  }`;

  const sectionLabelClass = `text-[10px] uppercase font-bold tracking-widest mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-gold/80' : 'text-gold'}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md border rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200'}`}
        >
          <div className={`px-6 py-5 border-b flex items-center gap-3 shrink-0 ${theme === 'dark' ? 'border-gold/10 bg-black/20' : 'border-gray-100 bg-gray-50/50'}`}>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -ml-2 text-warm-gray hover:text-gold transition-colors rounded-full hover:bg-gold/10"
              aria-label="Retour"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h3 className="font-bebas text-xl text-gold tracking-widest uppercase leading-none">Créer un compte</h3>
              <p className="text-[10px] text-warm-gray mt-1">Rejoignez BarberGo en quelques secondes</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-2 text-warm-gray hover:text-gold transition-colors rounded-full hover:bg-gold/10"
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
          </div>

          <form className="p-6 space-y-6 overflow-y-auto" onSubmit={handleSubmit}>
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold text-black text-[10px] font-bold uppercase tracking-widest shadow-md shadow-gold/20">
              <Scissors size={13} /> Inscription Professionnel Beauté
            </div>

            <div>
              <p className={sectionLabelClass}><Users size={12} /> Informations personnelles</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-warm-gray uppercase font-bold mb-1 block">Prénom</label>
                  <input
                    required
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                    className={`w-full border px-4 py-2.5 text-xs outline-none rounded-lg transition-all focus:ring-2 focus:ring-gold/30 ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white focus:border-gold/60' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gold/60'}`}
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-warm-gray uppercase font-bold mb-1 block">Nom</label>
                  <input
                    required
                    value={formData.lastName}
                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                    className={`w-full border px-4 py-2.5 text-xs outline-none rounded-lg transition-all focus:ring-2 focus:ring-gold/30 ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white focus:border-gold/60' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gold/60'}`}
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[10px] text-warm-gray uppercase font-bold mb-1 block">Genre</label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData({...formData, gender: e.target.value as any})}
                  className={`w-full border px-4 py-2.5 text-xs outline-none rounded-lg transition-all focus:ring-2 focus:ring-gold/30 ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white focus:border-gold/60' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gold/60'}`}
                >
                  <option value="homme">Homme</option>
                  <option value="femme">Femme</option>
                </select>
              </div>

              {formData.role === 'barber' && (
                <div className="mt-4">
                  <label className="text-[10px] text-warm-gray uppercase font-bold mb-1 block">Tranche d'âge</label>
                  <select
                    value={formData.ageRange}
                    onChange={e => setFormData({...formData, ageRange: e.target.value as any})}
                    className={`w-full border px-4 py-2.5 text-xs outline-none rounded-lg transition-all focus:ring-2 focus:ring-gold/30 ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white focus:border-gold/60' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gold/60'}`}
                  >
                    <option value="">Préférer ne pas préciser</option>
                    <option value="18-25">18-25 ans</option>
                    <option value="26-35">26-35 ans</option>
                    <option value="36-45">36-45 ans</option>
                    <option value="46-55">46-55 ans</option>
                    <option value="56+">56 ans et plus</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <p className={sectionLabelClass}><Phone size={12} /> Coordonnées</p>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-warm-gray uppercase font-bold mb-1 block">
                    Numéro de téléphone <span className="text-warm-gray/50 normal-case font-normal">(optionnel pour l'instant)</span>
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/50" />
                    <input
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className={inputClass}
                      placeholder="+212 6 XX XX XX XX"
                    />
                  </div>
                  <p className="text-[9px] text-warm-gray/60 mt-1 leading-relaxed">
                    À renseigner depuis ton tableau de bord avant de pouvoir accepter des réservations, avec ta CIN et un selfie de vérification.
                  </p>
                </div>

                <div>
                  <label className="text-[10px] text-warm-gray uppercase font-bold mb-1 block">Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/50" />
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className={inputClass}
                      placeholder="jean.dupont@example.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className={sectionLabelClass}><Lock size={12} /> Sécurité du compte</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-warm-gray uppercase font-bold mb-1 block">Mot de passe</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/50" />
                    <input
                      required
                      type="password"
                      minLength={6}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className={inputClass}
                      placeholder="6 caractères min."
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-warm-gray uppercase font-bold mb-1 block">Confirmer</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/50" />
                    <input
                      required
                      type="password"
                      minLength={6}
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className={inputClass}
                      placeholder="Répéter"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 uppercase font-bold tracking-[0.2em] shadow-xl shadow-gold/10 flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>Finaliser l'inscription <ChevronRight size={16} /></>
              )}
            </button>

            <button
              type="button"
              onClick={onSwitchToLogin}
              className="w-full text-[10px] text-warm-gray hover:text-gold uppercase font-bold tracking-wide"
            >
              Déjà un compte ? Se connecter
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
