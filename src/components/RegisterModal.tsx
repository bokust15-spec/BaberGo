import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Users, Scissors, Phone, Mail, Lock, ChevronRight, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (data: any) => Promise<void>;
  theme: 'dark' | 'light';
  defaultRole?: 'client' | 'barber';
}

export default function RegisterModal({ isOpen, onClose, onRegister, theme, defaultRole = 'client' }: RegisterModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'homme' as 'homme' | 'femme' | 'autre',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'client' as 'client' | 'barber'
  });
  const [cinFile, setCinFile] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, role: defaultRole }));
      setError(null);
    }
  }, [isOpen, defaultRole]);

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
      const { confirmPassword, ...rest } = formData;
      const payload = {
        ...rest,
        ...(formData.role === 'barber' ? {
          kycStatus: cinFile && selfieFile ? 'pending' : 'unverified',
          kycCinUrl: cinFile ? 'https://barbergo.ma/simulated/cin.jpg' : '',
          kycSelfieUrl: selfieFile ? 'https://barbergo.ma/simulated/selfie.jpg' : '',
          unpaidCommissionsCount: 0,
          totalCommissionsOwed: 0,
        } : {})
      };
      await onRegister(payload);
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
        className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
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
            <div className="flex gap-2 p-1 bg-black/20 rounded-xl">
               <button
                type="button"
                onClick={() => setFormData({...formData, role: 'client'})}
                className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 ${formData.role === 'client' ? 'bg-gold text-black shadow-md shadow-gold/20' : 'text-warm-gray hover:text-white'}`}
               >
                 <Users size={13} /> Client
               </button>
               <button
                type="button"
                onClick={() => setFormData({...formData, role: 'barber'})}
                className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 ${formData.role === 'barber' ? 'bg-gold text-black shadow-md shadow-gold/20' : 'text-warm-gray hover:text-white'}`}
               >
                 <Scissors size={13} /> Coiffeur
               </button>
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
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>

            <div>
              <p className={sectionLabelClass}><Phone size={12} /> Coordonnées</p>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-warm-gray uppercase font-bold mb-1 block">Numéro de téléphone</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/50" />
                    <input
                      required
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className={inputClass}
                      placeholder="+212 6 XX XX XX XX"
                    />
                  </div>
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

            {formData.role === 'barber' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-black/40 border-gold/20' : 'bg-gray-50 border-gray-200'}`}
              >
                <h4 className="text-[10px] text-gold uppercase tracking-widest font-bold flex items-center gap-2">
                  <ShieldCheck size={14} /> Vérification KYC obligatoire (Maroc)
                </h4>
                <p className="text-[9px] text-warm-gray leading-relaxed">
                  Conformément aux normes réglementaires de BarberGo, les coiffeurs indépendants doivent téléverser leurs documents officiels pour être autorisés à opérer à Casablanca.
                </p>

                {/* CIN Upload Box */}
                <div className="space-y-1">
                  <span className="text-[9px] text-warm-gray uppercase font-bold block">1. Pièce d'identité (CIN recto/verso)</span>
                  <button
                    type="button"
                    onClick={() => setCinFile('CIN_Maroc_CNIE.pdf')}
                    className={`w-full p-3 border border-dashed rounded-lg flex items-center justify-between text-xs transition-colors ${
                      cinFile
                        ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400 font-semibold'
                        : 'border-white/10 hover:border-gold/50 text-warm-gray'
                    }`}
                  >
                    <span className="truncate">{cinFile || 'Glisser ou cliquer pour charger la CIN (.pdf, .jpg)'}</span>
                    {cinFile && <Check size={14} className="shrink-0 text-emerald-400" />}
                  </button>
                </div>

                {/* Selfie Upload Box */}
                <div className="space-y-1">
                  <span className="text-[9px] text-warm-gray uppercase font-bold block">2. Selfie de validation en direct</span>
                  <button
                    type="button"
                    onClick={() => setSelfieFile('selfie_validation.jpg')}
                    className={`w-full p-3 border border-dashed rounded-lg flex items-center justify-between text-xs transition-colors ${
                      selfieFile
                        ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400 font-semibold'
                        : 'border-white/10 hover:border-gold/50 text-warm-gray'
                    }`}
                  >
                    <span className="truncate">{selfieFile || 'Prendre ou charger un Selfie de validation'}</span>
                    {selfieFile && <Check size={14} className="shrink-0 text-emerald-400" />}
                  </button>
                </div>
              </motion.div>
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
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
