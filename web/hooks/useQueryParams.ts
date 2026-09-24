'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

/** State filter disimpan di URL (bisa dibagikan & tombol back bekerja) */
export function useQueryParams<K extends string>(keys: readonly K[]) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const values = useMemo(() => {
    const result = {} as Record<K, string | undefined>;
    for (const key of keys) result[key] = searchParams.get(key) ?? undefined;
    return result;
    // keys statis per pemanggil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const update = useCallback(
    (patch: Partial<Record<K | 'page', string | number | undefined | null>>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === '') params.delete(key);
        else params.set(key, String(value));
      }
      if (resetPage && !('page' in patch)) params.delete('page');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const page = Number(searchParams.get('page') ?? 1) || 1;
  return { values, update, page };
}
