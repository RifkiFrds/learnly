'use client';

import L from 'leaflet';
import { useEffect } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { MAP_TILE_URL } from '@/lib/geo';

// Pin SVG dengan warna token (ikon bawaan Leaflet tidak ikut ter-bundle dengan benar)
function pinIcon(color: string, pulse = false) {
  return L.divIcon({
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
    html: `<div style="position:relative;width:28px;height:36px">
      ${pulse ? `<span style="position:absolute;left:4px;top:4px;width:20px;height:20px;border-radius:9999px;background:${color};opacity:.25;animation:ping 1.6s cubic-bezier(0,0,.2,1) infinite"></span>` : ''}
      <svg width="28" height="36" viewBox="0 0 28 36" aria-hidden="true"><path d="M14 1C7 1 1.5 6.4 1.5 13.3 1.5 22.5 14 35 14 35s12.5-12.5 12.5-21.7C26.5 6.4 21 1 14 1z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="14" cy="13.5" r="4.5" fill="#fff"/></svg>
    </div>`,
  });
}

const ICONS = {
  primary: pinIcon('#C15F3C'),
  info: pinIcon('#3D6B8A', true),
  success: pinIcon('#4A7C59'),
};

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  tone?: keyof typeof ICONS;
}

export interface MapCircle {
  lat: number;
  lng: number;
  radiusKm: number;
  label?: string;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    const parsed = JSON.parse(key) as [number, number][];
    if (parsed.length === 1) map.setView(parsed[0], Math.max(map.getZoom(), 13));
    else if (parsed.length > 1) map.fitBounds(L.latLngBounds(parsed), { padding: [32, 32], maxZoom: 14 });
  }, [key, map]);
  return null;
}

/** Peta tampilan: pin + lingkaran wilayah layanan */
export function MapView({
  center,
  markers = [],
  circles = [],
  zoom = 12,
  className,
  onMapClick,
}: {
  center: { lat: number; lng: number };
  markers?: MapMarker[];
  circles?: MapCircle[];
  zoom?: number;
  className?: string;
  onMapClick?: (point: { lat: number; lng: number }) => void;
}) {
  const points: [number, number][] = [
    ...markers.map((m) => [m.lat, m.lng] as [number, number]),
    ...circles.flatMap((c) => {
      const delta = c.radiusKm / 111;
      return [
        [c.lat - delta, c.lng - delta],
        [c.lat + delta, c.lng + delta],
      ] as [number, number][];
    }),
  ];
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={zoom} scrollWheelZoom={false} className={className}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url={MAP_TILE_URL} />
      {circles.map((circle, index) => (
        <Circle
          key={`c-${index}`}
          center={[circle.lat, circle.lng]}
          radius={circle.radiusKm * 1000}
          pathOptions={{ color: '#C15F3C', weight: 1.5, fillColor: '#F3E1D6', fillOpacity: 0.35 }}
        >
          {circle.label && <Popup>{circle.label}</Popup>}
        </Circle>
      ))}
      {markers.map((marker, index) => (
        <Marker key={`m-${index}`} position={[marker.lat, marker.lng]} icon={ICONS[marker.tone ?? 'primary']} title={marker.label ?? 'Titik lokasi'} alt={marker.label ?? 'Titik lokasi'}>
          {marker.label && <Popup>{marker.label}</Popup>}
        </Marker>
      ))}
      {points.length > 0 && <FitBounds points={points} />}
      {onMapClick && <ClickHandler onClick={onMapClick} />}
    </MapContainer>
  );
}

function ClickHandler({ onClick }: { onClick: (point: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(event) {
      onClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }, [lat, lng, map]);
  return null;
}

/** Peta pemilih titik: klik peta atau geser pin untuk menentukan lokasi */
export function MapPicker({
  value,
  onChange,
  radiusKm,
  className,
}: {
  value: { lat: number; lng: number };
  onChange: (point: { lat: number; lng: number }) => void;
  radiusKm?: number;
  className?: string;
}) {
  return (
    <MapContainer center={[value.lat, value.lng]} zoom={15} scrollWheelZoom className={className}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url={MAP_TILE_URL} />
      {radiusKm ? (
        <Circle
          center={[value.lat, value.lng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#C15F3C', weight: 1.5, fillColor: '#F3E1D6', fillOpacity: 0.35 }}
        />
      ) : null}
      <Marker
        position={[value.lat, value.lng]}
        icon={ICONS.primary}
        title="Titik lokasi terpilih — geser untuk memindahkan"
        alt="Titik lokasi terpilih"
        draggable
        eventHandlers={{
          dragend(event) {
            const point = (event.target as L.Marker).getLatLng();
            onChange({ lat: point.lat, lng: point.lng });
          },
        }}
      />
      <ClickHandler onClick={onChange} />
      <Recenter lat={value.lat} lng={value.lng} />
    </MapContainer>
  );
}
