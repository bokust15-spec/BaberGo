import React from 'react';

// Placeholder shown in the feed grids while the barbers list is still loading, so the
// page shows a shape immediately instead of a blank grid that pops in a beat later.
const SkeletonCard: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  const blockClass = theme === 'dark' ? 'bg-white/10' : 'bg-gray-200';
  return (
    <div className={`rounded-lg overflow-hidden border animate-pulse ${theme === 'dark' ? 'border-gold/10 bg-mid-brown/20' : 'border-gray-200 bg-white'}`}>
      <div className={`aspect-square ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} />
      <div className="p-2.5 space-y-2.5">
        <div className={`h-3 rounded-sm w-3/4 ${blockClass}`} />
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full shrink-0 ${blockClass}`} />
          <div className={`h-2.5 rounded-sm w-1/2 ${blockClass}`} />
        </div>
        <div className="flex items-center justify-between">
          <div className={`h-2.5 rounded-sm w-8 ${blockClass}`} />
          <div className={`h-2.5 rounded-sm w-10 ${blockClass}`} />
        </div>
      </div>
      <div className={`h-8 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} />
    </div>
  );
};

export default SkeletonCard;
