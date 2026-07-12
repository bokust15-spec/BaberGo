import { motion, AnimatePresence } from 'motion/react';
import { X, Share, SquarePlus } from 'lucide-react';

interface InstallInstructionsModalProps {
  onClose: () => void;
  theme: 'dark' | 'light';
}

// iOS Safari has no API to trigger "Add to Home Screen" programmatically — Apple only
// exposes it through the manual Share sheet — so this just walks the user through it.
export default function InstallInstructionsModal({ onClose, theme }: InstallInstructionsModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-sm border rounded-sm overflow-hidden ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200'}`}
        >
          <div className="p-6 border-b border-gold/10 flex justify-between items-center">
            <h3 className="font-bebas text-xl text-gold tracking-widest uppercase">Installer BarberGo</h3>
            <button onClick={onClose} className="p-2 -mr-2 text-warm-gray hover:text-gold transition-colors" aria-label="Fermer">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-7 h-7 rounded-full bg-gold text-black flex items-center justify-center text-xs font-bold">1</div>
              <p className="text-xs text-warm-gray leading-relaxed pt-1">
                Appuie sur l'icône de partage <Share size={13} className="inline text-gold -mt-0.5" /> en bas de Safari.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-7 h-7 rounded-full bg-gold text-black flex items-center justify-center text-xs font-bold">2</div>
              <p className="text-xs text-warm-gray leading-relaxed pt-1">
                Fais défiler et appuie sur <SquarePlus size={13} className="inline text-gold -mt-0.5" /> <strong className="text-gold">Sur l'écran d'accueil</strong>.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-7 h-7 rounded-full bg-gold text-black flex items-center justify-center text-xs font-bold">3</div>
              <p className="text-xs text-warm-gray leading-relaxed pt-1">
                Appuie sur <strong className="text-gold">Ajouter</strong> en haut à droite. C'est fait !
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
