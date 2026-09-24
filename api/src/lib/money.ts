import type { Prisma } from '@prisma/client';

/** Nilai DECIMAL Prisma → number (aman untuk nominal rupiah skala aplikasi ini). */
export const toNumber = (value: Prisma.Decimal | number | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value);

/** Pembulatan ke rupiah penuh. */
export const roundRupiah = (value: number): number => Math.round(value);
