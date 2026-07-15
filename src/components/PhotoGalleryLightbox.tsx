import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Heart, Share2 } from 'lucide-react';
import { formatRelativeTime } from '../utils/relativeTime';

export interface LightboxPhoto {
  url: string;
  name?: string;
  price?: number;
  createdAt?: number;
  // Optional — shown top-left as a clickable avatar + name (e.g. browsing a
  // search-results grid, where the photo itself opens this viewer instead of jumping
  // straight to the pro's profile) so the viewer can still reach the profile from here
  // in one tap, Facebook-style. Kept per-photo, not gallery-level, since a
  // search-results gallery mixes posts from different pros.
  barberName?: string;
  barberAvatarUrl?: string;
  onBarberClick?: () => void;
  // Present only for posts that support real likes (search-results/feed photos). When
  // absent, the like button falls back to a local, non-persisted toggle (e.g. viewing
  // your own avatar/cover/realization photos, where "liking" isn't a real action).
  postId?: string;
}

interface PhotoGalleryLightboxProps {
  photos: LightboxPhoto[];
  initialIndex: number;
  onClose: () => void;
  onFetchLikeState?: (postId: string) => Promise<{ count: number; liked: boolean }>;
  onToggleLike?: (postId: string) => Promise<{ count: number; liked: boolean } | undefined>;
}

// Fullscreen photo viewer with left/right navigation through the rest of the set —
// used for cover/avatar photos (single-item), "Réalisations" galleries (multi-item, one
// pro), and search-results grids (multi-item, many pros) alike.
const SWIPE_THRESHOLD = 60;

export default function PhotoGalleryLightbox({ photos, initialIndex, onClose, onFetchLikeState, onToggleLike }: PhotoGalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  // Real like state when a photo has a postId (fetched from Firestore); local-only
  // fallback (keyed by url) for photos without one, so each swiped-to photo keeps its
  // own independent state either way.
  const [likedUrls, setLikedUrls] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

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

  const current = photos.length > 0 ? photos[Math.min(index, photos.length - 1)] : null;

  useEffect(() => {
    if (!current?.postId || !onFetchLikeState) return;
    let cancelled = false;
    onFetchLikeState(current.postId).then((state) => {
      if (cancelled) return;
      setLikedUrls(prev => ({ ...prev, [current.url]: state.liked }));
      setLikeCounts(prev => ({ ...prev, [current.url]: state.count }));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.postId, current?.url]);

  if (!current) return null;

  const handleDragEnd = (_e: any, info: { offset: { x: number } }) => {
    if (!hasMultiple) return;
    if (info.offset.x > SWIPE_THRESHOLD) goPrev();
    else if (info.offset.x < -SWIPE_THRESHOLD) goNext();
  };

  const liked = !!likedUrls[current.url];
  const likeCount = likeCounts[current.url] || 0;

  const toggleLike = async () => {
    setLikedUrls(prev => ({ ...prev, [current.url]: !prev[current.url] }));
    setLikeCounts(prev => ({ ...prev, [current.url]: liked ? Math.max(0, (prev[current.url] || 0) - 1) : (prev[current.url] || 0) + 1 }));
    if (current.postId && onToggleLike) {
      const result = await onToggleLike(current.postId);
      if (result) {
        setLikedUrls(prev => ({ ...prev, [current.url]: result.liked }));
        setLikeCounts(prev => ({ ...prev, [current.url]: result.count }));
      }
    }
  };

  const handleShare = async () => {
    const shareData = { title: 'BarberGo', text: current.name ? `${current.name} sur BarberGo` : 'BarberGo', url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard) await navigator.clipboard.writeText(shareData.url);
    } catch {
      // User cancelled the native share sheet — nothing to do.
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black"
      >
        {/* Top-left: avatar + name, straight to profile — Facebook-style */}
        {current.barberName && (
          <button
            onClick={(e) => { e.stopPropagation(); current.onBarberClick?.(); }}
            className="absolute top-4 left-4 flex items-center gap-2 z-20"
          >
            {current.barberAvatarUrl && (
              <img src={current.barberAvatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white/80 shrink-0" />
            )}
            <span className="text-white text-sm font-bold drop-shadow">{current.barberName}</span>
          </button>
        )}

        <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-gold transition-colors z-20" aria-label="Fermer">
          <X size={28} />
        </button>

        {hasMultiple && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:text-gold transition-colors z-20"
            aria-label="Photo précédente"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <motion.img
            key={current.url}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
            src={current.url}
            alt=""
            drag={hasMultiple ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing touch-pan-y"
          />

          {/* Right side: like + share icon rail */}
          <div className="absolute right-4 bottom-28 flex flex-col items-center gap-6 z-20">
            <button onClick={(e) => { e.stopPropagation(); toggleLike(); }} className="flex flex-col items-center gap-1">
              <Heart size={30} className={liked ? 'fill-red-500 text-red-500' : 'text-white drop-shadow'} />
              {likeCount > 0 && <span className="text-white text-[11px] font-bold drop-shadow">{likeCount}</span>}
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="flex flex-col items-center gap-1">
              <Share2 size={26} className="text-white drop-shadow" />
            </button>
          </div>

          {/* Bottom caption */}
          {(current.name || current.price !== undefined || current.createdAt || hasMultiple) && (
            <div className="absolute bottom-6 left-4 right-20 z-20 flex flex-col items-start gap-1">
              {(current.name || current.price !== undefined) && (
                <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
                  {current.name && <span className="text-white text-xs font-bold uppercase tracking-widest">{current.name}</span>}
                  {current.price !== undefined && <span className="text-gold text-xs font-bold">{current.price} DH</span>}
                </div>
              )}
              {current.createdAt && (
                <span className="text-white/50 text-[10px] uppercase tracking-widest px-1">{formatRelativeTime(current.createdAt)}</span>
              )}
              {hasMultiple && (
                <span className="text-white/50 text-[10px] uppercase tracking-widest px-1">{index + 1} / {photos.length}</span>
              )}
            </div>
          )}
        </div>

        {hasMultiple && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:text-gold transition-colors z-20"
            aria-label="Photo suivante"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
