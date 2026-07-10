import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface LightboxPhoto {
  url: string;
  name?: string;
  price?: number;
}

interface PhotoGalleryLightboxProps {
  photos: LightboxPhoto[];
  initialIndex: number;
  onClose: () => void;
}

// Fullscreen photo viewer with left/right navigation through the rest of the set —
// used for cover/avatar photos (single-item) and "Réalisations" galleries (multi-item)
// alike, for guests, clients and pros browsing any profile, including their own.
export default function PhotoGalleryLightbox({ photos, initialIndex, onClose }: PhotoGalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  if (photos.length === 0) return null;
  const current = photos[Math.min(index, photos.length - 1)];
  const hasMultiple = photos.length > 1;

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex(i => (i - 1 + photos.length) % photos.length);
  };
  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex(i => (i + 1) % photos.length);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10 bg-black/90 backdrop-blur-sm"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-gold transition-colors z-10" aria-label="Fermer">
          <X size={28} />
        </button>

        {hasMultiple && (
          <button
            onClick={goPrev}
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:text-gold transition-colors z-10"
            aria-label="Photo précédente"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <div className="flex flex-col items-center gap-4 max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
          <motion.img
            key={current.url}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
            src={current.url}
            alt=""
            className="max-w-full max-h-[70vh] md:max-h-[75vh] object-contain rounded-sm"
          />
          {(current.name || current.price !== undefined) && (
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
              {current.name && <span className="text-white text-xs font-bold uppercase tracking-widest">{current.name}</span>}
              {current.price !== undefined && <span className="text-gold text-xs font-bold">{current.price} DH</span>}
            </div>
          )}
          {hasMultiple && (
            <span className="text-white/50 text-[10px] uppercase tracking-widest">{index + 1} / {photos.length}</span>
          )}
        </div>

        {hasMultiple && (
          <button
            onClick={goNext}
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:text-gold transition-colors z-10"
            aria-label="Photo suivante"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
