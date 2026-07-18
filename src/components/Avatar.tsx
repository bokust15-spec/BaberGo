import React from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: string; // Tailwind size classes, e.g. "w-12 h-12"
  className?: string;
}

// A real user with no uploaded photo gets a plain generic placeholder — never a random
// stock photo standing in for them (see avatarFor() in mockBarberFeed.ts, which is
// reserved for STYLE_POSTS demo content, not real accounts).
export default function Avatar({ src, alt = '', size = 'w-12 h-12', className = '' }: AvatarProps) {
  if (src) {
    return <img src={src} alt={alt} className={`${size} rounded-full object-cover shrink-0 ${className}`} />;
  }
  return (
    <div className={`${size} rounded-full bg-gray-500 flex items-center justify-center shrink-0 ${className}`}>
      <User className="w-[55%] h-[55%] text-white" strokeWidth={1.75} />
    </div>
  );
}
