import React from 'react';
import { Star, BadgeCheck, Navigation } from 'lucide-react';
import { categoryLabel } from '../data/categories';

interface ProfileRowProps {
  avatarUrl: string;
  name: string;
  verified?: boolean;
  // null rating = "Nouveau" (real pro with zero reviews yet — never a made-up number).
  rating: number | null;
  reviewCount?: number;
  distanceKm: number | null;
  categories?: string[];
  theme: 'dark' | 'light';
  onClick: () => void;
}

const MAX_CATEGORIES_SHOWN = 3;

// A profile-first search result row (Instagram "Profils" tab style): avatar + name,
// real rating (or "Nouveau" if no reviews yet), distance, and the pro's real
// specialties. No "Suivre"/"Réserver" — tapping the row goes straight to the pro's
// profile, where booking happens.
const ProfileRow: React.FC<ProfileRowProps> = ({ avatarUrl, name, verified, rating, reviewCount, distanceKm, categories, theme, onClick }) => {
  const labels = (categories || []).map(categoryLabel);
  const servicesText = labels.length > MAX_CATEGORIES_SHOWN
    ? `${labels.slice(0, MAX_CATEGORIES_SHOWN).join(', ')} et plus…`
    : labels.join(', ');
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${theme === 'dark' ? 'border-gold/15 bg-mid-brown/20 hover:bg-mid-brown/30' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
    >
      <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-gold/30 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-bold flex items-center gap-1 truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {name}
          {verified && <BadgeCheck size={14} className="text-gold shrink-0" />}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-gold text-[11px] font-bold shrink-0">
            <Star size={11} className="fill-gold" />
            {rating !== null ? rating.toFixed(1) : 'Nouveau'}
            {rating !== null && reviewCount ? <span className="text-warm-gray font-normal">({reviewCount})</span> : null}
          </span>
          {distanceKm !== null && (
            <span className="flex items-center gap-1 text-warm-gray text-[11px] shrink-0">
              <Navigation size={11} className="text-gold shrink-0" /> {distanceKm} km
            </span>
          )}
          {servicesText && (
            <span className="text-warm-gray text-[11px] truncate" title={labels.join(', ')}>
              · {servicesText}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default ProfileRow;
