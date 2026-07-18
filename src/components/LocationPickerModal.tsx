import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Check, Search } from 'lucide-react';

interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
}

interface LocationPickerModalProps {
  theme: 'dark' | 'light';
  initialCenter?: { lat: number; lng: number };
  onConfirm: (loc: { lat: number; lng: number }) => void;
  onClose: () => void;
}

// Casablanca — fallback center when no GPS position is available to start from.
const DEFAULT_CENTER: [number, number] = [33.5731, -7.5898];

// Free, no-API-key map (OpenStreetMap tiles via Leaflet) so a client can pick an exact
// spot by tapping or dragging a pin instead of typing an address — the old text-search
// flow required writing something out, which is exactly what this replaces.
export default function LocationPickerModal({ theme, initialCenter, onConfirm, onClose }: LocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number }>(
    initialCenter || { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] }
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const start: [number, number] = initialCenter ? [initialCenter.lat, initialCenter.lng] : DEFAULT_CENTER;
    const map = L.map(mapContainerRef.current).setView(start, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(start, { draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setPosition({ lat: pos.lat, lng: pos.lng });
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Leaflet sizes itself off its container's dimensions at creation time — inside a
    // just-opened modal that can be 0x0 for a frame, so this re-measures once the modal
    // has actually laid out (otherwise the map renders blank/mis-tiled).
    const resizeTimer = setTimeout(() => map.invalidateSize(), 100);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lets the user find a reference point by name (e.g. "Aera Mall") instead of only
  // tapping/dragging blindly on the map — Nominatim (OpenStreetMap's own geocoder) is
  // free and needs no API key, matching this modal's existing no-key tile setup.
  // Biased toward Morocco (countrycodes=ma) since that's the only market this app serves.
  const searchPlace = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ma&limit=5&q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      const results: PlaceResult[] = (data || []).map((item: any) => ({
        label: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
      setSearchResults(results);
      if (results.length === 0) setSearchError('Aucun lieu trouvé.');
    } catch {
      setSearchError('Recherche indisponible pour le moment.');
    }
    setSearching(false);
  };

  const selectSearchResult = (place: PlaceResult) => {
    setPosition({ lat: place.lat, lng: place.lng });
    setSearchResults([]);
    setSearchQuery(place.label);
    if (mapRef.current && markerRef.current) {
      const latLng = L.latLng(place.lat, place.lng);
      markerRef.current.setLatLng(latLng);
      mapRef.current.setView(latLng, 16);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-xl border overflow-hidden shadow-2xl ${theme === 'dark' ? 'bg-mid-brown border-gold/30' : 'bg-white border-gray-200'}`}
      >
        <div className="p-4 border-b border-gold/10 flex items-center justify-between">
          <span className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Choisir un lieu sur la carte</span>
          <button onClick={onClose} className="text-warm-gray hover:text-gold transition-colors"><X size={18} /></button>
        </div>
        <div className={`p-4 pb-0 relative`}>
          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchPlace(); } }}
              placeholder="Rechercher un lieu (ex: Aera Mall, Casablanca)"
              className={`w-full pl-3 pr-10 py-2.5 rounded-lg text-xs outline-none border ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white placeholder:text-warm-gray/50' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            />
            <button
              onClick={searchPlace}
              disabled={searching || !searchQuery.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-warm-gray hover:text-gold transition-colors disabled:opacity-40"
              aria-label="Rechercher"
            >
              <Search size={15} />
            </button>
          </div>
          {searchError && <p className="text-[10px] text-red-400 mt-1.5">{searchError}</p>}
          {searchResults.length > 0 && (
            // z-[1100]: Leaflet's own panes/controls use z-index up to 1000 (see
            // leaflet.css), and since neither this modal card nor the map container
            // establishes its own stacking context, a lower z-index here gets painted
            // over by the map once it's mounted — this must clear 1000 to stay visible.
            <div className={`absolute left-4 right-4 z-[1100] mt-1 rounded-lg border max-h-48 overflow-y-auto shadow-lg ${theme === 'dark' ? 'bg-mid-brown border-gold/20' : 'bg-white border-gray-200'}`}>
              {searchResults.map((place, i) => (
                <button
                  key={i}
                  onClick={() => selectSearchResult(place)}
                  className={`w-full text-left px-3 py-2 text-[11px] border-b last:border-b-0 transition-colors ${theme === 'dark' ? 'border-white/5 text-warm-gray hover:bg-black/30 hover:text-white' : 'border-gray-100 text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                  {place.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div ref={mapContainerRef} className="w-full h-72 mt-3" />
        <div className="p-4">
          <p className="text-[10px] text-warm-gray mb-3">Touchez la carte ou déplacez le repère pour choisir l'endroit exact, ou recherchez un lieu ci-dessus.</p>
          <button
            onClick={() => onConfirm(position)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-gold text-black text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-gold-light transition-colors"
          >
            <Check size={14} /> Confirmer cet emplacement
          </button>
        </div>
      </div>
    </div>
  );
}
