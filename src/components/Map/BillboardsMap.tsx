import { useEffect, useRef } from 'react';
import type { Billboard } from '@/types';

function ensureLeafletLoaded(): Promise<any> {
  return new Promise((resolve) => {
    if ((window as any).L) return resolve((window as any).L);
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const scriptId = 'leaflet-js';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => resolve((window as any).L);
      document.body.appendChild(script);
    } else {
      const el = document.getElementById(scriptId) as HTMLScriptElement;
      if (el && (el as any).dataset.loaded === 'true') {
        resolve((window as any).L);
      } else {
        el?.addEventListener('load', () => resolve((window as any).L), { once: true });
      }
    }
  });
}

function parseCoords(b: Billboard): [number, number] | null {
  const coords = (b as any).coordinates;
  if (!coords) return null;
  if (typeof coords === 'string') {
    const parts = coords.split(',').map((c: string) => parseFloat(c.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return [parts[0], parts[1]];
  } else if (typeof coords === 'object' && typeof (coords as any).lat === 'number' && typeof (coords as any).lng === 'number') {
    return [(coords as any).lat, (coords as any).lng];
  }
  return null;
}

export default function BillboardsMap({ billboards }: { billboards: Billboard[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    ensureLeafletLoaded().then((L) => {
      if (!isMounted || !mapRef.current) return;
      if (!leafletMapRef.current) {
        const center: [number, number] = [32.8872, 13.1913];
        const map = L.map(mapRef.current).setView(center, 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);
        leafletMapRef.current = map;
      }

      const map = leafletMapRef.current;
      const markers: any[] = [];
      billboards.forEach((b) => {
        const c = parseCoords(b);
        if (!c) return;
        const marker = L.marker(c).addTo(map);
        const price = (b.price || 0).toLocaleString();
        marker.bindPopup(`<b>${b.name}</b><br/>${b.location}<br/>${price} د.ل/شهر`);
        markers.push(marker);
      });

      // fit bounds if we have at least one marker
      const coordsArr = billboards.map(parseCoords).filter(Boolean) as [number, number][];
      if (coordsArr.length) {
        const bounds = L.latLngBounds(coordsArr as any);
        map.fitBounds(bounds.pad(0.2));
      }

      return () => {
        markers.forEach((m) => m.remove());
      };
    });

    return () => { isMounted = false };
  }, [billboards]);

  return <div ref={mapRef} className="w-full h-96 rounded-lg border" />;
}
