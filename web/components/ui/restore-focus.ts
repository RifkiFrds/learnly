'use client';

import * as React from 'react';

/**
 * Dialog/sheet yang dibuka dari state (bukan <Trigger>) tidak tahu harus mengembalikan fokus ke mana.
 * Hook ini mengingat elemen yang fokus saat dibuka dan memfokuskannya lagi saat ditutup (WCAG 2.4.3).
 */
export function useRestoreFocus(props: {
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const returnTo = React.useRef<HTMLElement | null>(null);
  const { onOpenAutoFocus, onCloseAutoFocus } = props;
  return {
    onOpenAutoFocus: (event: Event) => {
      const active = document.activeElement;
      returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null;
      onOpenAutoFocus?.(event);
    },
    onCloseAutoFocus: (event: Event) => {
      onCloseAutoFocus?.(event);
      const target = returnTo.current;
      if (!event.defaultPrevented && target?.isConnected) {
        event.preventDefault();
        target.focus();
      }
    },
  };
}
