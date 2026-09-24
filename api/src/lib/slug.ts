/** Tanda diakritik gabungan (U+0300–U+036F) yang tersisa setelah normalize('NFKD') */
const COMBINING_MARKS = new RegExp(
  `[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`,
  'g',
);

/** "Persiapan UTBK 2027!" → "persiapan-utbk-2027" */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

export { COMBINING_MARKS };
