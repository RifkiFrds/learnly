import { describe, expect, it } from 'vitest';
import {
  canTransition,
  describeInvalidTransition,
  isCancellable,
  isFinal,
  nextStatuses,
} from './booking-status';

describe('state machine booking tatap muka (FR-TRACK-01)', () => {
  const happyPath = [
    'pending_confirmation',
    'menunggu_pembayaran',
    'dikonfirmasi',
    'tutor_bersiap',
    'tutor_dalam_perjalanan',
    'tutor_tiba',
    'sesi_berlangsung',
    'sesi_selesai',
  ] as const;

  it('mengizinkan alur maju sesuai urutan resmi', () => {
    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(canTransition('tatap_muka', happyPath[i], happyPath[i + 1])).toBe(true);
    }
  });

  it('menolak lompat status (mis. dikonfirmasi → tutor_tiba)', () => {
    expect(canTransition('tatap_muka', 'dikonfirmasi', 'tutor_tiba')).toBe(false);
    expect(canTransition('tatap_muka', 'tutor_bersiap', 'sesi_berlangsung')).toBe(false);
  });

  it('menolak transisi mundur', () => {
    expect(canTransition('tatap_muka', 'tutor_dalam_perjalanan', 'tutor_bersiap')).toBe(false);
    expect(canTransition('tatap_muka', 'sesi_selesai', 'sesi_berlangsung')).toBe(false);
  });

  it('pembatalan hanya sebelum sesi_berlangsung', () => {
    for (const status of happyPath.slice(0, 6)) {
      expect(isCancellable('tatap_muka', status)).toBe(true);
    }
    expect(isCancellable('tatap_muka', 'sesi_berlangsung')).toBe(false);
    expect(isCancellable('tatap_muka', 'sesi_selesai')).toBe(false);
  });

  it('status akhir tidak punya transisi lanjutan', () => {
    for (const status of ['rejected', 'sesi_selesai', 'dibatalkan'] as const) {
      expect(isFinal(status)).toBe(true);
      expect(nextStatuses('tatap_muka', status)).toEqual([]);
    }
  });

  it('pesan error menyebut langkah valid berikutnya', () => {
    const message = describeInvalidTransition('tatap_muka', 'dikonfirmasi', 'tutor_tiba');
    expect(message).toContain('Tutor sedang bersiap');
  });
});

describe('state machine booking online (FR-ONLINE-03)', () => {
  it('langsung dikonfirmasi → sesi_berlangsung → sesi_selesai', () => {
    expect(canTransition('online', 'dikonfirmasi', 'sesi_berlangsung')).toBe(true);
    expect(canTransition('online', 'sesi_berlangsung', 'sesi_selesai')).toBe(true);
  });

  it('tidak punya status perjalanan fisik', () => {
    expect(canTransition('online', 'dikonfirmasi', 'tutor_bersiap')).toBe(false);
    expect(canTransition('online', 'tutor_bersiap', 'tutor_dalam_perjalanan')).toBe(false);
  });
});
