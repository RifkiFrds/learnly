import { InfoRow } from '@/components/common/Bits';
import { formatDuration, formatRupiah } from '@/lib/format';

/** Rincian biaya booking: tarif × durasi + biaya layanan = total (FR-PAY-01). */
export function CostSummary({
  hourlyRate,
  durationMinutes,
  subtotal,
  serviceFee,
  total,
  feeNote,
}: {
  hourlyRate: number;
  durationMinutes: number;
  subtotal: number;
  serviceFee: number;
  total: number;
  feeNote?: string;
}) {
  return (
    <dl className="divide-y divide-border">
      <div className="pb-2">
        <InfoRow label={`${formatRupiah(hourlyRate)} × ${formatDuration(durationMinutes)}`} value={formatRupiah(subtotal)} />
        <InfoRow label={feeNote ? `Biaya layanan (${feeNote})` : 'Biaya layanan'} value={formatRupiah(serviceFee)} />
      </div>
      <div className="pt-2">
        <InfoRow label="Total dibayar" value={formatRupiah(total)} strong />
      </div>
    </dl>
  );
}
