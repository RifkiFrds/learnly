'use client';

import { LocateFixed, Search } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { currentPosition, DEFAULT_CENTER, geocode, reverseGeocode } from '@/lib/geo';
import { MapPicker } from './index';

/**
 * Pin lokasi lewat peta (FR-BOOK-02, FR-TUTOR-03): cari nama tempat, pakai lokasi sekarang,
 * atau klik/geser pin. `onAddress` menerima alamat hasil reverse-geocoding (opsional).
 */
export function LocationPicker({
  value,
  onChange,
  onAddress,
  radiusKm,
  heightClass = 'h-72',
}: {
  value: { lat: number; lng: number } | null;
  onChange: (point: { lat: number; lng: number }) => void;
  onAddress?: (address: string) => void;
  radiusKm?: number;
  heightClass?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const point = value ?? DEFAULT_CENTER;

  async function pick(next: { lat: number; lng: number }) {
    onChange(next);
    if (onAddress) {
      const address = await reverseGeocode(next.lat, next.lng);
      if (address) onAddress(address);
    }
  }

  async function search() {
    if (!query.trim()) return;
    setBusy(true);
    setMessage(null);
    const found = await geocode(query.trim());
    setBusy(false);
    if (!found) {
      setMessage('Tempat belum ketemu. Coba nama jalan, kelurahan, atau kecamatan.');
      return;
    }
    onChange({ lat: found.lat, lng: found.lng });
    onAddress?.(found.label);
  }

  async function locate() {
    setMessage(null);
    try {
      await pick(await currentPosition());
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <label htmlFor={`${id}-q`} className="sr-only">
          Cari tempat di peta
        </label>
        <Input
          id={`${id}-q`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              search();
            }
          }}
          placeholder="Cari jalan, kelurahan, atau kecamatan"
        />
        <Button type="button" variant="secondary" onClick={search} disabled={busy} aria-label="Cari tempat">
          <Search />
          <span className="hidden sm:inline">{busy ? 'Mencari…' : 'Cari'}</span>
        </Button>
        <Button type="button" variant="secondary" size="icon" onClick={locate} aria-label="Pakai lokasiku sekarang">
          <LocateFixed />
        </Button>
      </div>
      {message && (
        <p className="text-body-sm text-danger-600" role="alert">
          {message}
        </p>
      )}
      <div className={`${heightClass} overflow-hidden rounded-lg border border-border`}>
        <MapPicker value={point} onChange={pick} radiusKm={radiusKm} className="h-full w-full" />
      </div>
      <p className="text-body-sm text-ink-500">
        Klik peta atau geser pin untuk menyesuaikan titik. Koordinat: {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
      </p>
    </div>
  );
}
