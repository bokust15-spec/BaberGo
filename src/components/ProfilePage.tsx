import React from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, Calendar, ChevronRight, LogOut, Scissors, MapPin } from 'lucide-react';
import { UserProfile, Service } from '../hooks/useFirebase';
import CreateAnnonceForm from './CreateAnnonceForm';

interface ProfilePageProps {
  profile: UserProfile;
  onContinue: () => void;
  onLogout: () => void;
  theme: 'dark' | 'light';
  services?: Service[];
  barbers?: UserProfile[];
  onCreateAnnonce?: (
    serviceId: string, 
    dateTime: Date, 
    totalPrice: number, 
    proposedPrice?: number, 
    clientNotes?: string,
    targetBarberId?: string
  ) => Promise<void>;
}

export default function ProfilePage({ 
  profile, 
  onContinue, 
  onLogout, 
  theme,
  services = [],
  barbers = [],
  onCreateAnnonce
}: ProfilePageProps) {
  const isClient = profile.role === 'client';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'}`}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full ${isClient ? 'max-w-5xl' : 'max-w-2xl'} border rounded-sm overflow-hidden ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200 shadow-2xl'}`}
      >
        {/* Header Decodation */}
        <div className="h-32 bg-gold/10 relative overflow-hidden border-b border-gold/20 flex items-center justify-center">
           <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full repeating-lines"></div>
           </div>
           <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-24 h-24 bg-gold rounded-full border-4 border-mid-brown flex items-center justify-center z-10 shadow-xl"
           >
             <User size={48} className="text-black" />
           </motion.div>
        </div>

        <div className={`p-6 md:p-10 ${isClient ? 'grid grid-cols-1 md:grid-cols-2 gap-8' : 'text-center'}`}>
          {/* PROFILE CARD & ACTION CONTROL */}
          <div className="flex flex-col justify-between space-y-6">
            <div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h1 className={`text-3xl md:text-4xl font-bebas tracking-wider uppercase mb-1 ${isClient ? 'text-left' : 'text-center'} ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Bienvenue, {profile.firstName}
                </h1>
                <div className={`flex items-center gap-2 mb-6 ${isClient ? 'justify-start' : 'justify-center'}`}>
                  <span className="px-2.5 py-0.5 bg-gold text-black text-[9px] font-bold uppercase tracking-widest rounded-sm">
                    {profile.role === 'barber' ? 'Expert Partenaire' : 'Client Privilège'}
                  </span>
                  <span className={`text-[9px] uppercase tracking-widest font-bold ${theme === 'dark' ? 'text-warm-gray' : 'text-gray-400'}`}>
                    Casablanca Est. 2026
                  </span>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 gap-3.5 text-left">
                <div className={`p-4 rounded-sm border ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Mail size={14} className="text-gold" />
                    <span className="text-[9px] text-warm-gray uppercase font-bold tracking-widest">Email Professionnel</span>
                  </div>
                  <div className={`text-xs font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-905'}`}>{profile.email}</div>
                </div>

                <div className={`p-4 rounded-sm border ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Phone size={14} className="text-gold" />
                    <span className="text-[9px] text-warm-gray uppercase font-bold tracking-widest">Téléphone de contact</span>
                  </div>
                  <div className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-90c'}`}>{profile.phone}</div>
                </div>

                <div className={`p-4 rounded-sm border ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={14} className="text-gold" />
                    <span className="text-[9px] text-warm-gray uppercase font-bold tracking-widest">Genre</span>
                  </div>
                  <div className={`text-xs font-semibold capitalize ${theme === 'dark' ? 'text-white' : 'text-gray-90c'}`}>{profile.gender}</div>
                </div>

                <div className={`p-4 rounded-sm border ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={14} className="text-gold" />
                    <span className="text-[9px] text-warm-gray uppercase font-bold tracking-widest">Statut Compte</span>
                  </div>
                  <div className="text-xs font-semibold text-green-500">Vérifié & Actif</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
              <button 
                onClick={onContinue}
                className="flex-1 btn-primary py-4 uppercase font-bold tracking-[0.2em] text-[11px] flex items-center justify-center gap-2 group"
              >
                Dashboard <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={onLogout}
                className={`px-6 py-4 text-[9px] font-bold uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${theme === 'dark' ? 'border-white/10 text-warm-gray hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <LogOut size={14} /> Déconnexion
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: ANNONCE GENERATOR FORM FOR CLIENT */}
          {isClient && (
            <div className="border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8 flex flex-col justify-center">
              {onCreateAnnonce && services.length > 0 ? (
                <CreateAnnonceForm 
                  services={services}
                  barbers={barbers}
                  onBook={onCreateAnnonce}
                  theme={theme}
                  onSuccess={onContinue} // on success, auto direct client to the MVP where agenda is live!
                />
              ) : (
                <div className="text-center py-8 opacity-45">
                   <Scissors size={32} className="text-gold mx-auto mb-2 animate-bounce" />
                   <p className="text-xs uppercase tracking-wider font-bold">Chargement du configurateur...</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className={`p-4 border-t text-[9px] uppercase tracking-[0.3em] font-bold transition-colors ${theme === 'dark' ? 'bg-black/40 border-gold/10 text-gold/30' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
          BarberGo Corporate System &copy; 2026 - Casablanca Secure InDrive Flow
        </div>
      </motion.div>
    </div>
  );
}
