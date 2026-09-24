import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock,
  LoaderCircle,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { statusInfo, type StatusKind, type Tone } from '@/lib/status';

const ICON: Record<Tone, LucideIcon> = {
  warning: Clock,
  info: LoaderCircle,
  success: CircleCheck,
  danger: CircleAlert,
  neutral: CircleDashed,
  brand: CircleDashed,
};

/**
 * Satu-satunya cara menampilkan status booking/pembayaran/kursus (docs/10-design-system.md §4.1 & §5):
 * pasangan bg-{tone}-100 + text-{tone}-600, ikon kecil di depan, label Bahasa Indonesia.
 */
export function StatusBadge({
  kind,
  status,
  className,
}: {
  kind: StatusKind;
  status: string | null | undefined;
  className?: string;
}) {
  const info = statusInfo(kind, status);
  const Icon = ICON[info.tone];
  return (
    <Badge variant={info.tone} className={className}>
      <Icon aria-hidden />
      {info.label}
    </Badge>
  );
}
