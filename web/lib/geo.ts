// Geocoding gratis via OpenStreetMap Nominatim (docs/02-srs.md §3). Dipanggil hemat: hanya saat user
// menekan cari, bukan per ketikan (kebijakan penggunaan Nominatim: maks. 1 request/detik).

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

export const DEFAULT_CENTER: GeoPoint = { lat: -6.2088, lng: 106.8456, label: 'Jakarta' };

export const MAP_TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export async function geocode(query: string): Promise<GeoPoint | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=id&accept-language=id&q=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const rows = (await response.json()) as { lat: string; lon: string; display_name: string }[];
    if (!rows.length) return null;
    return { lat: Number(rows[0].lat), lng: Number(rows[0].lon), label: rows[0].display_name };
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&accept-language=id&lat=${lat}&lon=${lng}`;
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const row = (await response.json()) as { display_name?: string };
    return row.display_name ?? null;
  } catch {
    return null;
  }
}

/** Geolocation API browser dengan pesan manusiawi saat ditolak/gagal (PRD §6: fallback ke input manual) */
export function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Browser ini tidak mendukung lokasi otomatis. Ketik nama daerahmu saja.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) =>
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? 'Izin lokasi ditolak. Ketik nama daerahmu atau aktifkan izin lokasi di browser.'
              : 'Lokasi belum bisa dideteksi. Coba lagi atau ketik nama daerahmu.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}
