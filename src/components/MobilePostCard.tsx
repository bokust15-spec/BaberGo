import React, { useEffect, useState } from 'react';
import { Heart, Share2, MapPin, BadgeCheck, Layers } from 'lucide-react';
import Avatar from './Avatar';

interface MobilePostCardProps {
  postId: string;
  photoUrl: string;
  // Total photos in this post's own carousel (1-15) — a "1/N" badge (top-right, like
  // Instagram) shows only when there's more than one.
  photoCount?: number;
  caption: string;
  price: number;
  city: string;
  barberAvatarUrl?: string;
  barberName: string;
  verified?: boolean;
  onOpenPhoto: () => void;
  onOpenProfile: () => void;
  onFetchLikeState: (postId: string) => Promise<{ count: number; liked: boolean }>;
  onToggleLike: (postId: string) => Promise<{ count: number; liked: boolean } | undefined>;
  // Liking requires an account — a signed-out visitor tapping the heart is prompted to
  // log in/sign up (onRequireAuth) instead of the like silently going nowhere. Defaults
  // to "allowed" so contexts that are always authenticated (the pro's own dashboard)
  // don't need to pass anything.
  isLoggedIn?: boolean;
  onRequireAuth?: () => void;
}

// Instagram/Reels-style full-bleed post card for mobile browsing — one big photo,
// avatar + name top-left (taps straight to the pro's profile, Facebook-style), a
// like/share icon rail on the right. No "Suivre" and no "Réserver" button on the card
// itself: booking lives on the profile, opened via the avatar/name tap.
const MobilePostCard: React.FC<MobilePostCardProps> = ({
  postId,
  photoUrl,
  photoCount,
  caption,
  price,
  city,
  barberAvatarUrl,
  barberName,
  verified,
  onOpenPhoto,
  onOpenProfile,
  onFetchLikeState,
  onToggleLike,
  isLoggedIn = true,
  onRequireAuth,
}) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    onFetchLikeState(postId).then((state) => {
      if (!cancelled) { setLiked(state.liked); setLikeCount(state.count); }
    });
    return () => { cancelled = true; };
  }, [postId, onFetchLikeState]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) { onRequireAuth?.(); return; }
    setLiked((l) => !l);
    setLikeCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    const result = await onToggleLike(postId);
    if (result) { setLiked(result.liked); setLikeCount(result.count); }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // A "?post=" link lets whoever opens it land straight on this exact post (see the
    // resolver in AppMVP) instead of just the generic homepage.
    const shareUrl = `${window.location.origin}${window.location.pathname}?post=${encodeURIComponent(postId)}`;
    const shareData = { title: 'BaberGo', text: `${caption} par ${barberName} sur BaberGo`, url: shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
      }
    } catch {
      // User cancelled the native share sheet — nothing to do.
    }
  };

  return (
    <div
      onClick={onOpenPhoto}
      className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-black cursor-pointer"
    >
      <img src={photoUrl} alt={caption} className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

      {/* Top-right: "1/N" carousel badge, Instagram-style — only when this post has more than one photo */}
      {!!photoCount && photoCount > 1 && (
        <span className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full">
          <Layers size={11} /> 1/{photoCount}
        </span>
      )}

      {/* Top-left: avatar + name, straight to profile — like tapping a name on Facebook */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
        className="absolute top-3 left-3 flex items-center gap-2 z-10"
      >
        <Avatar src={barberAvatarUrl} size="w-9 h-9" className="border-2 border-white/80" />
        <span className="text-white text-xs font-bold drop-shadow flex items-center gap-1 max-w-[42vw] truncate">
          {barberName}
          {verified && <BadgeCheck size={13} className="text-gold shrink-0" />}
        </span>
      </button>

      {/* Right side: like + share icon rail */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <Heart size={26} className={liked ? 'fill-red-500 text-red-500' : 'text-white drop-shadow'} />
          {likeCount > 0 && <span className="text-white text-[10px] font-bold drop-shadow">{likeCount}</span>}
        </button>
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <Share2 size={24} className="text-white drop-shadow" />
        </button>
      </div>

      {/* Bottom caption */}
      <div className="absolute bottom-3 left-3 right-16 z-10 pointer-events-none">
        <p className="text-white text-xs font-bold truncate drop-shadow">{caption}</p>
        <p className="text-white/85 text-[10px] flex items-center gap-1 drop-shadow">
          <MapPin size={10} className="text-gold shrink-0" /> {city} · <span className="text-gold font-bold">{price} DH</span>
        </p>
      </div>
    </div>
  );
};

export default MobilePostCard;
