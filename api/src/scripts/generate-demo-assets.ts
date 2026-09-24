/**
 * Membuat ulang aset dummy demo ke api/seed-assets/ (hasilnya di-commit; seeder hanya menyalin).
 *
 *   npm run demo:assets
 *
 * Tanpa internet, tanpa foto orang/AI face, tanpa aset berhak cipta. Video tidak dibuat
 * (ffmpeg tidak dipakai) — kursus demo memakai lesson bacaan + PDF, kuis, dan tugas.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { COURSES, TUTORS } from './demo/data';
import { courseCoverSvg, qrisSvg, receiptSvg, textPdf, tutorDocumentPdf } from './demo/assets';
import { LESSON_FOOTER, LESSON_PDFS, SUBMISSION_FOOTER, SUBMISSIONS } from './demo/content';
import { receiptSpecs } from './demo/derived';

export const SEED_ASSETS_DIR = path.resolve(__dirname, '../../seed-assets');

async function write(relative: string, content: string | Buffer) {
  const file = path.join(SEED_ASSETS_DIR, relative);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
  return (await fs.stat(file)).size;
}

async function main() {
  await fs.rm(SEED_ASSETS_DIR, { recursive: true, force: true });
  let bytes = 0;
  let count = 0;
  const add = async (relative: string, content: string | Buffer) => {
    bytes += await write(relative, content);
    count += 1;
  };

  for (const course of COURSES) await add(`covers/${course.slug}.svg`, courseCoverSvg(course));
  for (const tutor of TUTORS) {
    for (const doc of tutor.documents) await add(`documents/${tutor.key}-${doc.kind}.pdf`, await tutorDocumentPdf(tutor, doc));
  }
  for (const spec of receiptSpecs()) {
    await add(`receipts/${spec.key}.svg`, receiptSvg({ payer: spec.payer, amount: spec.amount, date: '19.42 WIB', reference: spec.reference, note: spec.note }));
  }
  await add('qris/qris-contoh.svg', await qrisSvg());
  for (const [key, lesson] of Object.entries(LESSON_PDFS)) {
    await add(`lessons/${key}.pdf`, await textPdf({ ...lesson, footer: LESSON_FOOTER }));
  }
  for (const [key, submission] of Object.entries(SUBMISSIONS)) {
    await add(`submissions/${key}.pdf`, await textPdf({ kicker: 'Tugas siswa (contoh)', title: submission.title, body: submission.body, footer: SUBMISSION_FOOTER, watermarkText: 'CONTOH' }));
  }
  await add(
    'README.md',
    `# Aset demo Learnly\n\nDibuat oleh \`npm run demo:assets\` (src/scripts/generate-demo-assets.ts) dari data di \`src/scripts/demo/data.ts\`.\nJangan diedit manual — ubah datanya lalu jalankan ulang generator.\n\n- \`covers/\` sampul kursus tipografis (SVG, token warna design system)\n- \`documents/\` ijazah & sertifikat tutor dummy (PDF, watermark "DUMMY / CONTOH")\n- \`receipts/\` struk transfer dummy bertuliskan DEMO, nominal sesuai tagihan\n- \`qris/\` QR contoh berisi teks "LEARNLY-DEMO" berlabel "QRIS CONTOH" (bukan QRIS asli)\n- \`lessons/\` materi PDF lesson\n- \`submissions/\` contoh file tugas siswa\n\nTidak ada foto orang, wajah hasil AI, maupun aset berhak cipta. Tidak ada video (ffmpeg tidak tersedia saat pembuatan).\n`,
  );
  console.log(`[demo:assets] ${count} file, ${(bytes / 1024).toFixed(0)} KB → ${SEED_ASSETS_DIR}`);
}

main().catch((err) => {
  console.error('[demo:assets] gagal:', err);
  process.exit(1);
});
