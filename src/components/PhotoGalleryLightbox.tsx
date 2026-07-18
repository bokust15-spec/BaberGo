import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Heart, Share2 } from 'lucide-react';
import { formatRelativeTime } from '../utils/relativeTime';

export interface LightboxPhoto {
  url: string;
  // The full carousel for this post (1-15 photos, Instagram-style) when it has more
  // than one — absent/single-entry means this post is just the one photo (`url`).
  photoUrls?: string[];
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
  // Liking requires an account — a signed-out visitor tapping the heart is prompted to
  // log in/sign up (onRequireAuth) instead of the like silently going nowhere. Defaults
  // to "allowed" so contexts that are always authenticated (the pro's own dashboard)
  // don't need to pass anything.
  isLoggedIn?: boolean;
  onRequireAuth?: () => void;
}

// Fullscreen photo viewer with left/right navigation through the rest of the set —
// used for cover/avatar photos (single-item), "Réalisations" galleries (multi-item, one
// pro), and search-results grids (multi-item, many pros) alike. Each entry ("post") can
// itself hold a carousel of 1-15 photos (photoUrls) — swiping steps through the current
// post's own photos first, then rolls over into the next/previous post, same as
// Instagram's fullscreen viewer.
const SWIPE_THRESHOLD = 60;
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;

export default function PhotoGalleryLightbox({ photos, initialIndex, onClose, onFetchLikeState, onToggleLike, isLoggedIn = true, onRequireAuth }: PhotoGalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [subIndex, setSubIndex] = useState(0);
  // Real like state when a photo has a postId (fetched from Firestore); local-only
  // fallback (keyed by url) for photos without one, so each swiped-to post keeps its
  // own independent state either way.
  const [likedUrls, setLikedUrls] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  // Pinch (mobile) / wheel (desktop) zoom on the currently displayed image, plus
  // double-tap/double-click to toggle. `imgWrapRef` is the container both the zoom
  // handlers and the pan-bounds math measure against — not the <motion.img> itself, so
  // hit-testing stays consistent even when the rendered image is smaller than its box.
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const lastTouchDistRef = useRef<number | null>(null);
  const lastTapRef = useRef(0);
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setIndex(initialIndex);
    setSubIndex(0);
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  }, [initialIndex]);

  const hasMultiplePosts = photos.length > 1;
  const current = photos.length > 0 ? photos[Math.min(index, photos.length - 1)] : null;
  const currentPhotos = current ? (current.photoUrls && current.photoUrls.length > 0 ? current.photoUrls : [current.url]) : [];
  const hasSubPhotos = currentPhotos.length > 1;
  const clampedSubIndex = Math.min(subIndex, Math.max(0, currentPhotos.length - 1));
  const displayedUrl = currentPhotos[clampedSubIndex] || current?.url;

  // stepNext/stepPrev/goToPost mutate index/subIndex directly (never initialIndex), so
  // displayedUrl changing is the only reliable signal that the user navigated to a
  // different photo — without this, zoom/pan would carry over onto the next image.
  useEffect(() => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedUrl]);

  const goToPost = (newIndex: number, subIdx: number) => {
    setIndex((newIndex + photos.length) % photos.length);
    setSubIndex(subIdx);
  };

  // Step forward: next photo within the current post first, then roll into the next post.
  const stepNext = () => {
    if (clampedSubIndex < currentPhotos.length - 1) {
      setSubIndex(clampedSubIndex + 1);
    } else if (hasMultiplePosts) {
      goToPost(index + 1, 0);
    }
  };

  // Step back: previous photo within the current post first, then roll into the
  // previous post — landing on ITS last photo, so backward navigation feels continuous.
  const stepPrev = () => {
    if (clampedSubIndex > 0) {
      setSubIndex(clampedSubIndex - 1);
    } else if (hasMultiplePosts) {
      const prevIdx = (index - 1 + photos.length) % photos.length;
      const prevPost = photos[prevIdx];
      const prevCount = prevPost.photoUrls && prevPost.photoUrls.length > 0 ? prevPost.photoUrls.length : 1;
      goToPost(prevIdx, prevCount - 1);
    }
  };

  const canStep = hasMultiplePosts || hasSubPhotos;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && canStep) stepPrev();
      else if (e.key === 'ArrowRight' && canStep) stepNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canStep, index, subIndex, onClose]);

  if (!current) return null;

  const handleDragEnd = (_e: any, info: { offset: { x: number } }) => {
    if (!canStep) return;
    if (info.offset.x > SWIPE_THRESHOLD) stepPrev();
    else if (info.offset.x < -SWIPE_THRESHOLD) stepNext();
  };

  const isZoomed = scale > 1;

  // Pans are bounded so the zoomed image can't be dragged past its own edges — derived
  // from the rendered image size × scale vs. its container's box.
  const computePanConstraints = () => {
    const rect = imgWrapRef.current?.getBoundingClientRect();
    if (!rect) return { left: 0, right: 0, top: 0, bottom: 0 };
    const maxX = Math.max(0, (rect.width * scale - rect.width) / 2);
    const maxY = Math.max(0, (rect.height * scale - rect.height) / 2);
    return { left: -maxX, right: maxX, top: -maxY, bottom: maxY };
  };

  const zoomToward = (clientX: number, clientY: number, targetScale: number) => {
    const rect = imgWrapRef.current?.getBoundingClientRect();
    if (!rect) { setScale(targetScale); return; }
    setScale(targetScale);
    setPanOffset({
      x: (rect.width / 2 - (clientX - rect.left)) * (targetScale - 1),
      y: (rect.height / 2 - (clientY - rect.top)) * (targetScale - 1),
    });
  };

  const toggleZoomAt = (clientX: number, clientY: number) => {
    if (isZoomed) {
      setScale(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      zoomToward(clientX, clientY, DOUBLE_TAP_SCALE);
    }
  };

  // Desktop: mouse wheel zooms in/out, clamped; double-click toggles 1x/2.5x centered on
  // the click point.
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale - e.deltaY * 0.0015 * scale));
    setScale(next);
    if (next === MIN_SCALE) setPanOffset({ x: 0, y: 0 });
  };
  const handleDoubleClick = (e: React.MouseEvent) => toggleZoomAt(e.clientX, e.clientY);

  // Mobile: raw two-finger pinch (Framer Motion's drag/PanInfo is single-pointer only)
  // plus double-tap, mirroring the desktop double-click behavior.
  const touchDistance = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastTouchDistRef.current = touchDistance(e.touches);
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        toggleZoomAt(e.touches[0].clientX, e.touches[0].clientY);
      }
      lastTapRef.current = now;
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistRef.current != null) {
      const dist = touchDistance(e.touches);
      const delta = dist - lastTouchDistRef.current;
      lastTouchDistRef.current = dist;
      setScale(s => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta * 0.01)));
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) lastTouchDistRef.current = null;
    if (scale <= 1) setPanOffset({ x: 0, y: 0 });
  };

  const liked = !!likedUrls[current.url];
  const likeCount = likeCounts[current.url] || 0;

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

  const toggleLike = async () => {
    if (!isLoggedIn) { onRequireAuth?.(); return; }
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
    // A "?post=" link lets whoever opens it land straight on this exact post (see the
    // resolver in AppMVP) instead of just the generic homepage — only available when
    // this photo has a postId (search-feed photos; not avatar/cover/own-portfolio views).
    const shareUrl = current.postId
      ? `${window.location.origin}${window.location.pathname}?post=${encodeURIComponent(current.postId)}`
      : window.location.href;
    const shareData = { title: 'BarberGo', text: current.name ? `${current.name} sur BarberGo` : 'BarberGo', url: shareUrl };
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

        {/* Top-right: "X/Y" counter for the current post's own carousel (Instagram-style) */}
        {hasSubPhotos && (
          <span className="absolute top-4 right-16 z-20 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {clampedSubIndex + 1}/{currentPhotos.length}
          </span>
        )}

        <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-gold transition-colors z-20" aria-label="Fermer">
          <X size={28} />
        </button>

        {canStep && (
          <button
            onClick={(e) => { e.stopPropagation(); stepPrev(); }}
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:text-gold transition-colors z-20"
            aria-label="Photo précédente"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <div
          ref={imgWrapRef}
          className="relative w-full h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <motion.img
            key={displayedUrl}
            initial={{ opacity: 0 }} animate={{ opacity: 1, scale, x: panOffset.x, y: panOffset.y }} transition={{ duration: 0.15 }}
            src={displayedUrl}
            alt=""
            drag={isZoomed ? true : (canStep ? 'x' : false)}
            dragConstraints={isZoomed ? computePanConstraints() : { left: 0, right: 0 }}
            dragElastic={isZoomed ? 0.05 : 0.7}
            dragMomentum={!isZoomed}
            onDragStart={isZoomed ? () => { dragStartOffsetRef.current = panOffset; } : undefined}
            onDrag={isZoomed ? (_e, info) => setPanOffset({ x: dragStartOffsetRef.current.x + info.offset.x, y: dragStartOffsetRef.current.y + info.offset.y }) : undefined}
            onDragEnd={isZoomed ? undefined : handleDragEnd}
            className={`max-w-full max-h-full object-contain ${isZoomed ? 'cursor-move touch-none' : 'cursor-grab active:cursor-grabbing touch-pan-y'}`}
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

          {/* Dots for the current post's own carousel (Instagram-style) — sits above the
              bottom caption block, whose height varies with name/price/timestamp/post
              counter, so this needs enough clearance not to end up hidden behind it. */}
          {hasSubPhotos && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
              {currentPhotos.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === clampedSubIndex ? 'bg-gold' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}

          {/* Bottom caption */}
          {(current.name || current.price !== undefined || current.createdAt || hasMultiplePosts) && (
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
              {hasMultiplePosts && (
                <span className="text-white/50 text-[10px] uppercase tracking-widest px-1">{index + 1} / {photos.length}</span>
              )}
            </div>
          )}
        </div>

        {canStep && (
          <button
            onClick={(e) => { e.stopPropagation(); stepNext(); }}
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
