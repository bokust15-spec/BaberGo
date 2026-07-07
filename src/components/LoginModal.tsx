import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, ChevronRight } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<boolean>;
  theme: 'dark' | 'light';
}

export default function LoginModal({ isOpen, onClose, onLogin, theme }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await onLogin(email, password);
    setLoading(false);
    if (success) {
      onClose();
    }
  };

  if (!isOpen) return null;

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
          className={`w-full max-w-sm border rounded-sm overflow-hidden ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200'}`}
        >
          <div className="p-6 border-b border-gold/10 flex justify-between items-center">
            <h3 className="font-bebas text-xl text-gold tracking-widest uppercase">Se connecter</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-2 text-warm-gray hover:text-gold transition-colors"
              aria-label="Fermer"
            >
              <X size={24} />
            </button>
          </div>

          <form className="p-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-[10px] text-warm-gray uppercase font-bold mb-1 block">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/50" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`w-full border pl-10 pr-4 py-2 text-xs outline-none rounded-sm ${theme === 'dark' ? 'bg-black/40 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  placeholder="jean.dupont@example.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-warm-gray uppercase font-bold mb-1 block">Mot de passe</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/50" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`w-full border pl-10 pr-4 py-2 text-xs outline-none rounded-sm ${theme === 'dark' ? 'bg-black/40 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 uppercase font-bold tracking-[0.2em] shadow-xl shadow-gold/10 mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>Se connecter <ChevronRight size={16} /></>
              )}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
