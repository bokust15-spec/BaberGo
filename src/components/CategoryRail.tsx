import { LayoutGrid } from 'lucide-react';
import { SERVICE_CATEGORIES } from '../data/categories';

interface CategoryRailProps {
  selected: string | null; // null = "Tous"
  onSelect: (id: string | null) => void;
  theme: 'dark' | 'light';
  size?: 'default' | 'lg';
}

// Shared horizontally-scrolling category picker ("bande défilante") — used identically
// in the client search (AppMVP) and the barber's own "Accueil" tab (BarberDashboard)
// so both sides browse the same category set the same way.
export default function CategoryRail({ selected, onSelect, theme, size = 'default' }: CategoryRailProps) {
  const isLg = size === 'lg';
  const iconSize = isLg ? 16 : 14;
  const chipClass = (active: boolean) =>
    `flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-widest whitespace-nowrap shrink-0 transition-colors ${
      isLg ? 'px-5 py-2.5 text-xs' : 'px-4 py-2 text-[10px]'
    } ${
      active
        ? 'bg-gold border-gold text-black'
        : theme === 'dark'
        ? 'border-gold/20 text-warm-gray hover:border-gold/50 hover:text-gold'
        : 'border-gray-200 text-gray-500 hover:border-gold/50 hover:text-gold'
    }`;

  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen md:static md:left-0 md:right-0 md:mx-0 md:w-full overflow-x-auto scrollbar-hide mb-6">
      <div className={`flex w-max px-4 md:px-0 ${isLg ? 'gap-3' : 'gap-2'}`}>
        <button onClick={() => onSelect(null)} className={chipClass(selected === null)}>
          <LayoutGrid size={iconSize} />
          Tous
        </button>
        {SERVICE_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <button key={cat.id} onClick={() => onSelect(cat.id)} className={chipClass(selected === cat.id)}>
              <Icon size={iconSize} />
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
