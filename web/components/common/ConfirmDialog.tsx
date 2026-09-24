'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * §5 Modal konfirmasi aksi penting: selalu menyebut konsekuensi spesifik, bukan "Apakah kamu yakin?".
 * Opsional meminta alasan (mis. alasan pembatalan / penolakan).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  consequence,
  confirmLabel,
  cancelLabel = 'Kembali',
  destructive = false,
  reason,
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  consequence: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  reason?: { label: string; placeholder?: string; minLength?: number };
  pending?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [text, setText] = useState('');
  const minLength = reason?.minLength ?? 5;
  const reasonInvalid = reason ? text.trim().length < minLength : false;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setText('');
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-heading-lg">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-body-md text-ink-700">{consequence}</AlertDialogDescription>
        </AlertDialogHeader>
        {reason && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-reason">{reason.label}</Label>
            <Textarea
              id="confirm-reason"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={reason.placeholder}
              rows={3}
            />
            <p className="text-body-sm text-ink-500">Minimal {minLength} karakter.</p>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={pending || reasonInvalid}
            onClick={() => onConfirm(text.trim())}
          >
            {pending ? 'Memproses…' : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
