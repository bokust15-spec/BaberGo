import React, { useEffect, useState } from 'react';
import { Heart, Share2, MapPin, BadgeCheck, Layers } from 'lucide-react';

interface DesktopPostCardProps {
  postId: string;
  photoUrl: string;
  // Total photos in this post's own carousel (1-15) — a "1/N" badge (top-right of the
  // photo, like Instagram) shows only when there's more than one.
  photoCount?: number;
  caption: string;
  price: number;
  city: string;
  createdAtLabel?: string;
  barberAvatarUrl: string;
  barberName: string;
  verified?: boolean;
  theme: 'dark' | 'light';
  onOpenPhoto: () => void;
  onOpenProfile: () => void;
  onFetchLikeState: (postId: string) => Promise<{ count: number; liked: boolean }>;
  onToggleLike: (postId: string) => Promise<{ count: number; liked: boolean } | undefined>;
  // Liking requires an account — a signed-out visitor clicking "J'aime" is prompted to
  // log in/sign up (onRequireAuth) instead of the like silently going nowhere. Defaults
  // to "allowed" so contexts that are always authenticated (the pro's own dashboard)
  // don't need to pass anything.
  isLoggedIn?: boolean;
  onRequireAuth?: () => void;
}

// Facebook desktop-style feed post: header (avatar + name, click straight to profile)
// above the photo, full-width image, then a like/share action row below — no "Suivre"
// and no "Réserver" button on the post itself.
const DesktopPostCard: React.FC<DesktopPostCardProps> = ({
  postId,
  photoUrl,
  photoCount,
  caption,
  price,
  city,
  createdAtLabel,
  barberAvatarUrl,
  barberName,
  verified,
  theme,
  onOpenPhoto,
  onOpenProfile,
  onFetchLikeState,
  onToggleLike,
  isLoggedIn = true,
  onRequireAuth,
}) => {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    onFetchLikeState(postId).then((state) => {
      if (!cancelled) { setLiked(state.liked); setCount(state.count); }
    });
    return () => { cancelled = true; };
  }, [postId, onFetchLikeState]);

  const handleLike = async () => {
    if (!isLoggedIn) { onRequireAuth?.(); return; }
    setLiked((l) => !l);
    setCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    const result = await onToggleLike(postId);
    if (result) { setLiked(result.liked); setCount(result.count); }
  };

  const handleShare = async () => {
    // A "?post=" link lets whoever opens it land straight on this exact post (see the
    // resolver in AppMVP) instead of just the generic homepage.
    const shareUrl = `${window.location.origin}${window.location.pathname}?post=${encodeURIComponent(postId)}`;
    const shareData = { title: 'BarberGo', text: `${caption} par ${barberName} sur BarberGo`, url: shareUrl };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard) await navigator.clipboard.writeText(shareData.url);
    } catch {
      // User cancelled the native share sheet — nothing to do.
    }
  };

  return (
    <div className={`w-full max-w-xl mx-auto rounded-xl overflow-hidden border ${theme === 'dark' ? 'border-gold/15 bg-mid-brown/20' : 'border-gray-200 bg-white'}`}>
      {/* Header: avatar + name, straight to profile */}
      <button onClick={onOpenProfile} className="w-full flex items-center gap-3 p-4 text-left hover:bg-black/5 transition-colors">
        <img src={barberAvatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-gold/30 shrink-0" />
        <div className="min-w-0">
          <div className={`text-sm font-bold flex items-center gap-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {barberName}
            {verified && <BadgeCheck size={14} className="text-gold shrink-0" />}
          </div>
          <div className="text-warm-gray text-[10px] flex items-center gap-1">
            <MapPin size={10} className="text-gold shrink-0" /> {city}
            {createdAtLabel && <span> · {createdAtLabel}</span>}
          </div>
        </div>
      </button>

      {/* Photo */}
      <button onClick={onOpenPhoto} className="w-full block relative">
        <img src={photoUrl} alt={caption} className="w-full max-h-[520px] object-cover" loading="lazy" />
        {!!photoCount && photoCount > 1 && (
          <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full">
            <Layers size={11} /> 1/{photoCount}
          </span>
        )}
      </button>

      {/* Caption */}
      <div className="px-4 pt-3">
        <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{caption}</span>{' '}
        <span className="text-gold text-sm font-bold">— Dès {price} DH</span>
      </div>

      {count > 0 && (
        <div className="px-4 pt-2 text-warm-gray text-[11px]">{count} j'aime</div>
      )}

      {/* Action row */}
      <div className={`mt-3 border-t flex ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${liked ? 'text-red-500' : 'text-warm-gray hover:text-gold'}`}
        >
          <Heart size={16} className={liked ? 'fill-red-500 text-red-500' : ''} />
          J'aime
        </button>
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest text-warm-gray hover:text-gold transition-colors"
        >
          <Share2 size={16} />
          Partager
        </button>
      </div>
    </div>
  );
};

export default DesktopPostCard;
