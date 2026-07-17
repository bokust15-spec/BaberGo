import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Check } from 'lucide-react';

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
        <div ref={mapContainerRef} className="w-full h-72" />
        <div className="p-4">
          <p className="text-[10px] text-warm-gray mb-3">Touchez la carte ou déplacez le repère pour choisir l'endroit exact.</p>
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
