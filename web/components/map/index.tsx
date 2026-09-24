'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Leaflet butuh `window` → dimuat hanya di browser
const loading = () => <Skeleton className="h-full min-h-64 w-full rounded-lg" />;

export const MapView = dynamic(() => import('./LeafletMap').then((mod) => mod.MapView), { ssr: false, loading });
export const MapPicker = dynamic(() => import('./LeafletMap').then((mod) => mod.MapPicker), { ssr: false, loading });
export type { MapCircle, MapMarker } from './LeafletMap';
