'use client';

import { FileUp, X } from 'lucide-react';
import { useId, useRef } from 'react';
import { cn } from 'cn';

const LABEL: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WEBP',
};

/** Pemilih file dengan validasi tipe & ukuran di sisi klien (server tetap memvalidasi ulang) */
export function FileInput({
  label,
  accept,
  maxSizeMb = 5,
  file,
  onFile,
  error,
  hint,
}: {
  label: string;
  accept: string[];
  maxSizeMb?: number;
  file: File | null;
  onFile: (file: File | null, error?: string) => void;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const formats = accept.map((type) => LABEL[type] ?? type).join(', ');

  function choose(next: File | undefined) {
    if (!next) return onFile(null);
    if (!accept.includes(next.type)) return onFile(null, `Format belum didukung. Gunakan ${formats}.`);
    if (next.size > maxSizeMb * 1024 * 1024) return onFile(null, `Ukuran file maksimal ${maxSizeMb} MB.`);
    onFile(next);
  }

  return (
    <div className="space-y-1.5">
      <span id={`${id}-label`} className="block text-body-sm font-semibold text-ink-900">{label}</span>
      <div
        className={cn(
          'flex min-h-20 items-center gap-3 rounded-lg border border-dashed px-4 py-3',
          error ? 'border-danger-600 bg-danger-100/40' : 'border-border bg-surface',
        )}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          choose(event.dataTransfer.files[0]);
        }}
      >
        <FileUp className="size-6 shrink-0 text-ink-500" aria-hidden />
        <div className="min-w-0 flex-1 text-body-sm">
          {file ? (
            <p className="truncate font-semibold text-ink-900">{file.name}</p>
          ) : (
            <p className="text-ink-700">Seret file ke sini atau pilih dari perangkat</p>
          )}
          <p className="text-ink-500">{hint ?? `${formats} · maks. ${maxSizeMb} MB`}</p>
        </div>
        {file ? (
          <button
            type="button"
            onClick={() => {
              onFile(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="flex size-9 cursor-pointer items-center justify-center rounded-md text-ink-500 hover:bg-surface-muted"
            aria-label="Hapus file terpilih"
          >
            <X className="size-4" />
          </button>
        ) : (
          <label htmlFor={id} className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border px-4 text-body-sm font-semibold text-ink-900 hover:bg-surface-muted">
            Pilih file
          </label>
        )}
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept.join(',')}
          className="sr-only"
          aria-labelledby={`${id}-label`}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => choose(event.target.files?.[0])}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-body-sm text-danger-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
