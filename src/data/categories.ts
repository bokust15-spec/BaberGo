import { Scissors, Hand, Waves, Gem, Flower2, Palette, PenTool, LucideIcon } from 'lucide-react';

export interface ServiceCategory {
  id: string;
  label: string;
  icon: LucideIcon;
}

// The shared list of service categories offered on BarberGo — beyond hair, the
// platform now covers the beauty/wellness services most common in Morocco.
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: 'coiffure', label: 'Coiffure', icon: Scissors },
  { id: 'barbier', label: 'Barbier', icon: Scissors },
  { id: 'massage', label: 'Massage', icon: Hand },
  { id: 'hammam', label: 'Hammam', icon: Waves },
  { id: 'ongles', label: 'Ongles', icon: Gem },
  { id: 'soins-visage', label: 'Soins du visage', icon: Flower2 },
  { id: 'maquillage', label: 'Maquillage', icon: Palette },
  { id: 'henne', label: 'Henné', icon: PenTool },
];

export function categoryLabel(id: string): string {
  return SERVICE_CATEGORIES.find(c => c.id === id)?.label || id;
}
