export interface Barber {
  id: number;
  name: string;
  specialty: string;
  avatar: string;
  experience: number;
  clients: number;
  rating: number;
  price: number;
  portfolio: string[];
  reviews: { name: string; stars: number; text: string }[];
  position: { top: string; left: string };
  color: string;
}

export const BARBERS: Barber[] = [
  {
    id: 0,
    name: 'Karim El Fassi',
    specialty: 'Coupe homme · Dégradé · Barbe',
    avatar: '✂️',
    experience: 8,
    clients: 312,
    rating: 4.97,
    price: 150,
    portfolio: ['✂️', '🪒', '👤', '✨', '💈', '🎯', '🧔', '🪞'],
    reviews: [
      { name: 'Mehdi L.', stars: 5, text: '"Karim est ponctuel et vraiment doué. La coupe était parfaite !"' },
      { name: 'Adam T.', stars: 5, text: '"Meilleur barbier à domicile de Casablanca."' }
    ],
    position: { top: '22%', left: '28%' },
    color: '#c9a84c'
  },
  {
    id: 1,
    name: 'Nadia Bennani',
    specialty: 'Coupe femme · Couleur · Lissage',
    avatar: '💇‍♀️',
    experience: 12,
    clients: 580,
    rating: 4.95,
    price: 220,
    portfolio: ['💇‍♀️', '🎨', '✨', '💅', '🌟', '💫', '🪞', '🌺'],
    reviews: [
      { name: 'Sara I.', stars: 5, text: '"Nadia a compris exactement ce que je voulais. Résultat magnifique !"' },
      { name: 'Layla R.', stars: 5, text: '"Professionnelle, rapide, et de bon conseil."' }
    ],
    position: { top: '42%', left: '55%' },
    color: '#a86cc9'
  },
  {
    id: 2,
    name: 'Yassine Ouali',
    specialty: 'Dégradé · Tresses · Design barbe',
    avatar: '🧔',
    experience: 5,
    clients: 164,
    rating: 4.92,
    price: 120,
    portfolio: ['🧔', '✂️', '🎯', '🔱', '💈', '🌀', '🪒', '👤'],
    reviews: [
      { name: 'Omar B.', stars: 5, text: '"Super dégradé, service rapide. Je recommande !"' },
      { name: 'Rachid K.', stars: 4, text: '"Bon rapport qualité-prix."' }
    ],
    position: { top: '65%', left: '75%' },
    color: '#4ca8c9'
  },
  {
    id: 3,
    name: 'Fatima Zouak',
    specialty: 'Mariages · Tresses africaines · Soin',
    avatar: '💁‍♀️',
    experience: 15,
    clients: 890,
    rating: 4.99,
    price: 300,
    portfolio: ['💍', '🌸', '✨', '💫', '🌟', '🎀', '💃', '🌺'],
    reviews: [
      { name: 'Imane A.', stars: 5, text: '"Fatima est une artiste ! Ma coiffure de mariage était parfaite."' },
      { name: 'Kenza M.', stars: 5, text: '"Professionnalisme absolu. La meilleure de Casablanca."' }
    ],
    position: { top: '30%', left: '70%' },
    color: '#c96b4c'
  }
];
