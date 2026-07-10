import React, { useRef } from 'react';
import { Users, MapPin, CalendarDays, Scissors, Search } from 'lucide-react';

interface SearchBarProps {
  theme: 'dark' | 'light';
  searchGender: '' | 'homme' | 'femme';
  onSearchGenderChange: (v: '' | 'homme' | 'femme') => void;
  searchCity: string;
  onSearchCityChange: (v: string) => void;
  moroccanCities: string[];
  searchDateTime: string;
  onSearchDateTimeChange: (v: string) => void;
  searchStyle: string;
  onSearchStyleChange: (v: string) => void;
  onSearch: () => void;
}

// Shared between the client search view (AppMVP) and the pro-browsing-pro "Accueil"
// tab (BarberDashboard) — the same filters should work the same way for everyone
// looking for a professional, whichever side of the app they're on.
export default function SearchBar({
  theme,
  searchGender,
  onSearchGenderChange,
  searchCity,
  onSearchCityChange,
  moroccanCities,
  searchDateTime,
  onSearchDateTimeChange,
  searchStyle,
  onSearchStyleChange,
  onSearch
}: SearchBarProps) {
  const dateTimeInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`flex flex-col md:flex-row rounded-lg md:rounded-full border-2 border-gold overflow-hidden shadow-lg mb-3 ${theme === 'dark' ? 'bg-mid-brown' : 'bg-white'}`}>
      <div className={`flex-1 flex items-center gap-2 px-4 py-3 border-b md:border-b-0 md:border-r ${theme === 'dark' ? 'border-gold/15' : 'border-gray-200'}`}>
        <Users size={16} className="text-gold shrink-0" />
        <select
          value={searchGender}
          onChange={(e) => onSearchGenderChange(e.target.value as '' | 'homme' | 'femme')}
          className={`bg-transparent border-none outline-none text-xs w-full ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
        >
          <option value="" className={theme === 'dark' ? 'bg-mid-brown' : ''}>Un professionnel ou une professionnelle</option>
          <option value="homme" className={theme === 'dark' ? 'bg-mid-brown' : ''}>Un professionnel</option>
          <option value="femme" className={theme === 'dark' ? 'bg-mid-brown' : ''}>Une professionnelle</option>
        </select>
      </div>
      <div className={`flex-1 flex items-center gap-2 px-4 py-3 border-b md:border-b-0 md:border-r ${theme === 'dark' ? 'border-gold/15' : 'border-gray-200'}`}>
        <MapPin size={16} className="text-gold shrink-0" />
        <select
          value={searchCity}
          onChange={(e) => onSearchCityChange(e.target.value)}
          className={`bg-transparent border-none outline-none text-xs w-full ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
        >
          <option value="" className={theme === 'dark' ? 'bg-mid-brown' : ''}>Toutes les villes</option>
          {moroccanCities.map(city => (
            <option key={city} value={city} className={theme === 'dark' ? 'bg-mid-brown' : ''}>{city}</option>
          ))}
        </select>
      </div>
      <div className={`flex-1 flex items-center gap-2 px-4 py-3 border-b md:border-b-0 md:border-r ${theme === 'dark' ? 'border-gold/15' : 'border-gray-200'}`}>
        <button
          type="button"
          onClick={() => dateTimeInputRef.current?.showPicker?.()}
          className="text-gold shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Choisir la date et l'heure"
        >
          <CalendarDays size={24} />
        </button>
        <input
          ref={dateTimeInputRef}
          type="datetime-local"
          value={searchDateTime}
          onChange={(e) => onSearchDateTimeChange(e.target.value)}
          className={`bg-transparent border-none outline-none text-xs w-full [&::-webkit-calendar-picker-indicator]:opacity-0 ${theme === 'dark' ? 'text-white [color-scheme:dark]' : 'text-gray-900'}`}
        />
      </div>
      <div className="flex-1 flex items-center gap-2 px-4 py-3">
        <Scissors size={16} className="text-gold shrink-0" />
        <input
          value={searchStyle}
          onChange={(e) => onSearchStyleChange(e.target.value)}
          placeholder="Style ou prestation recherchée"
          className={`bg-transparent border-none outline-none text-xs w-full ${theme === 'dark' ? 'text-white placeholder:text-warm-gray' : 'text-gray-900 placeholder:text-gray-400'}`}
        />
      </div>
      <button
        onClick={onSearch}
        className="btn-primary md:rounded-none px-8 py-4 flex items-center justify-center gap-2 shrink-0"
      >
        <Search size={16} />
        Rechercher
      </button>
    </div>
  );
}
