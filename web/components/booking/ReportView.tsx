import { cn } from 'cn';
import type { ProgressReport } from '@/lib/types';

/** Isi laporan perkembangan sesi (FR-REPORT-01/02). */
export function ReportView({ report, className }: { report: ProgressReport; className?: string }) {
  const rows: [string, string | null][] = [
    ['Materi yang dibahas', report.materialsCovered],
    ['Sudah dikuasai', report.masteredSkills],
    ['Perlu ditingkatkan', report.areasToImprove],
    ['Pekerjaan rumah', report.homeworkGiven],
    ['Rekomendasi tutor', report.recommendationNotes],
  ];
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <p className="text-body-sm font-semibold text-ink-900">Tingkat pemahaman</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex gap-1" aria-hidden>
            {[1, 2, 3, 4, 5].map((level) => (
              <span key={level} className={cn('h-2 w-8 rounded-full', level <= report.understandingLevel ? 'bg-success-600' : 'bg-surface-muted')} />
            ))}
          </div>
          <span className="text-body-sm text-ink-700">
            {report.understandingLabel} ({report.understandingLevel}/5)
          </span>
        </div>
      </div>
      <dl className="space-y-3">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <dt className="text-body-sm font-semibold text-ink-900">{label}</dt>
              <dd className="mt-0.5 whitespace-pre-line text-body-md text-ink-700">{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}
