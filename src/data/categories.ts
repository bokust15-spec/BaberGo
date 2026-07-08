import React from 'react';
import { Scissors, ScissorsLineDashed, Palette, Sparkles, Flower2, Hand, PartyPopper } from 'lucide-react';
import FootToes from '../components/icons/FootToes';

export interface ServiceCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

// The shared list of service categories offered on BarberGo — beyond hair, the
// platform now covers the beauty/wellness services most common in Morocco.
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: 'cheveux', label: 'Cheveux', icon: Scissors },
  { id: 'barbe', label: 'Barbe', icon: ScissorsLineDashed },
  { id: 'main-pied', label: 'Main et pied', icon: FootToes },
  { id: 'makeup', label: 'Make-up', icon: Palette },
  { id: 'esthetique', label: 'Esthétique', icon: Sparkles },
  { id: 'soin-visage', label: 'Soin de visage', icon: Flower2 },
  { id: 'massage', label: 'Massage', icon: Hand },
  { id: 'beaute-evenementiel', label: 'Beauté évènementiel', icon: PartyPopper },
];

export function categoryLabel(id: string): string {
  return SERVICE_CATEGORIES.find(c => c.id === id)?.label || id;
}
