import { describe, expect, it } from 'vitest';
import { computeRefundAmount, decideVerification } from './payment.policy';

describe('verifikasi pembayaran manual (FR-PAY-03/08, NFR-AVAIL-02)', () => {
  it('approve bukti yang menunggu verifikasi → paid', () => {
    expect(decideVerification('menunggu_verifikasi', 'approve')).toEqual({
      kind: 'apply',
      nextStatus: 'paid',
    });
  });

  it('reject bukti yang menunggu verifikasi → ditolak', () => {
    expect(decideVerification('menunggu_verifikasi', 'reject')).toEqual({
      kind: 'apply',
      nextStatus: 'ditolak',
    });
  });

  it('mengulang approve pada pembayaran paid tidak mengubah apa pun (idempotent)', () => {
    expect(decideVerification('paid', 'approve')).toEqual({ kind: 'noop' });
  });

  it('mengulang reject pada pembayaran ditolak juga idempotent', () => {
    expect(decideVerification('ditolak', 'reject')).toEqual({ kind: 'noop' });
  });

  it('tidak bisa memverifikasi sebelum bukti diunggah', () => {
    expect(decideVerification('menunggu_pembayaran', 'approve').kind).toBe('conflict');
  });

  it('tidak bisa membalik keputusan (paid → ditolak, ditolak → paid)', () => {
    expect(decideVerification('paid', 'reject').kind).toBe('conflict');
    expect(decideVerification('ditolak', 'approve').kind).toBe('conflict');
  });

  it.each(['expired', 'refunded'] as const)('pembayaran %s tidak bisa diverifikasi', (status) => {
    expect(decideVerification(status, 'approve').kind).toBe('conflict');
  });
});

describe('kebijakan refund pembatalan (FR-PAY-06)', () => {
  const policy = { freeCancelHours: 24, lateRefundPercent: 50 };

  it('siswa batal ≥ 24 jam sebelum jadwal → refund penuh', () => {
    expect(
      computeRefundAmount({
        amount: 160_000,
        cancelledBy: 'student',
        hoursBeforeStart: 48,
        ...policy,
      }),
    ).toBe(160_000);
    expect(
      computeRefundAmount({
        amount: 160_000,
        cancelledBy: 'student',
        hoursBeforeStart: 24,
        ...policy,
      }),
    ).toBe(160_000);
  });

  it('siswa batal < 24 jam → refund sesuai persentase admin', () => {
    expect(
      computeRefundAmount({
        amount: 160_000,
        cancelledBy: 'student',
        hoursBeforeStart: 3,
        ...policy,
      }),
    ).toBe(80_000);
  });

  it('persentase 0 → tanpa refund', () => {
    expect(
      computeRefundAmount({
        amount: 160_000,
        cancelledBy: 'student',
        hoursBeforeStart: 1,
        freeCancelHours: 24,
        lateRefundPercent: 0,
      }),
    ).toBe(0);
  });

  it('tutor atau sistem membatalkan → selalu refund penuh', () => {
    expect(
      computeRefundAmount({
        amount: 160_000,
        cancelledBy: 'tutor',
        hoursBeforeStart: 1,
        ...policy,
      }),
    ).toBe(160_000);
    expect(
      computeRefundAmount({
        amount: 160_000,
        cancelledBy: 'system',
        hoursBeforeStart: -5,
        ...policy,
      }),
    ).toBe(160_000);
  });
});
