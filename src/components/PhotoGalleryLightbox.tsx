import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '../utils/relativeTime';

export interface LightboxPhoto {
  url: string;
  name?: string;
  price?: number;
  createdAt?: number;
  // Optional — shown as a clickable name below the photo (e.g. browsing a search-results
  // grid, where the photo itself opens this viewer instead of jumping straight to the
  // pro's profile) so the viewer can still reach the profile from here in one tap. Kept
  // per-photo, not gallery-level, since a search-results gallery mixes posts from
  // different pros — each photo can point to a different profile.
  barberName?: string;
  onBarberClick?: () => void;
}

interface PhotoGalleryLightboxProps {
  photos: LightboxPhoto[];
  initialIndex: number;
  onClose: () => void;
}

// Fullscreen photo viewer with left/right navigation through the rest of the set —
// used for cover/avatar photos (single-item), "Réalisations" galleries (multi-item, one
// pro), and search-results grids (multi-item, many pros) alike.
const SWIPE_THRESHOLD = 60;

export default function PhotoGalleryLightbox({ photos, initialIndex, onClose }: PhotoGalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const hasMultiple = photos.length > 1;

  const goPrev = () => setIndex(i => (i - 1 + photos.length) % photos.length);
  const goNext = () => setIndex(i => (i + 1) % photos.length);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && hasMultiple) goPrev();
      else if (e.key === 'ArrowRight' && hasMultiple) goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMultiple, onClose]);

  if (photos.length === 0) return null;
  const current = photos[Math.min(index, photos.length - 1)];

  const handleDragEnd = (_e: any, info: { offset: { x: number } }) => {
    if (!hasMultiple) return;
    if (info.offset.x > SWIPE_THRESHOLD) goPrev();
    else if (info.offset.x < -SWIPE_THRESHOLD) goNext();
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
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
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
            drag={hasMultiple ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            className="max-w-full max-h-[70vh] md:max-h-[75vh] object-contain rounded-sm cursor-grab active:cursor-grabbing touch-pan-y"
          />
          {current.barberName && (
            <button
              onClick={current.onBarberClick}
              className="text-gold text-sm font-bold uppercase tracking-widest hover:underline underline-offset-4"
            >
              {current.barberName}
            </button>
          )}
          {(current.name || current.price !== undefined) && (
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
              {current.name && <span className="text-white text-xs font-bold uppercase tracking-widest">{current.name}</span>}
              {current.price !== undefined && <span className="text-gold text-xs font-bold">{current.price} DH</span>}
            </div>
          )}
          {current.createdAt && (
            <span className="text-white/50 text-[10px] uppercase tracking-widest">{formatRelativeTime(current.createdAt)}</span>
          )}
          {hasMultiple && (
            <span className="text-white/50 text-[10px] uppercase tracking-widest">{index + 1} / {photos.length}</span>
          )}
        </div>

        {hasMultiple && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
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
