import { PDFDocument, rgb, StandardFonts, type PDFFont } from 'pdf-lib';
import { COMBINING_MARKS } from './slug';

// Sertifikat PDF dibuat langsung di dalam request (synchronous, tanpa job queue — docs/03-tech-stack.md §2.3).
// Warna mengikuti token design system (docs/10-design-system.md §4.1).

const hex = (value: string) =>
  rgb(
    parseInt(value.slice(1, 3), 16) / 255,
    parseInt(value.slice(3, 5), 16) / 255,
    parseInt(value.slice(5, 7), 16) / 255,
  );

const COLOR = {
  background: hex('#FAF8F4'),
  primary: hex('#C15F3C'),
  ink900: hex('#231F1A'),
  ink500: hex('#7A7267'),
  border: hex('#E4DFD5'),
};

// Karakter yang bisa dirender font standar PDF (WinAnsi): ASCII cetak, Latin-1, tanda kutip & dash
const code = (n: number) => String.fromCharCode(n);
const NOT_WIN_ANSI = new RegExp(
  `[^${code(0x20)}-${code(0x7e)}${code(0xa0)}-${code(0xff)}${[0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d].map(code).join('')}]`,
  'g',
);

/** Font standar PDF hanya mendukung WinAnsi → karakter di luar itu diganti agar tidak error. */
function sanitize(text: string): string {
  return text.normalize('NFKD').replace(COMBINING_MARKS, '').replace(NOT_WIN_ANSI, '?');
}

function centered(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = COLOR.ink900,
) {
  const safe = sanitize(text);
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: (page.getWidth() - width) / 2, y, size, font, color });
}

/** Perkecil ukuran font agar teks panjang (judul kursus/nama) tetap muat satu baris. */
function fitSize(font: PDFFont, text: string, maxWidth: number, size: number, min = 14) {
  let current = size;
  while (current > min && font.widthOfTextAtSize(sanitize(text), current) > maxWidth) current -= 1;
  return current;
}

export async function generateCertificatePdf(params: {
  certificateNumber: string;
  learnerName: string;
  courseTitle: string;
  issuedAt: Date;
  averageScore: number | null;
}): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Sertifikat ${params.courseTitle}`);
  pdf.setAuthor('Learnly');
  pdf.setSubject(`Sertifikat ${params.certificateNumber}`);

  const page = pdf.addPage([842, 595]); // A4 landscape
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const { width, height } = page.getSize();

  page.drawRectangle({ x: 0, y: 0, width, height, color: COLOR.background });
  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: height - 56,
    borderColor: COLOR.border,
    borderWidth: 1.5,
  });
  page.drawRectangle({ x: 28, y: height - 36, width: width - 56, height: 8, color: COLOR.primary });

  page.drawText('Learnly', { x: 64, y: height - 92, size: 26, font: serif, color: COLOR.ink900 });
  page.drawText('.', {
    x: 64 + serif.widthOfTextAtSize('Learnly', 26),
    y: height - 92,
    size: 26,
    font: serif,
    color: COLOR.primary,
  });

  centered(page, 'SERTIFIKAT PENYELESAIAN', height - 170, sansBold, 13, COLOR.primary);
  centered(page, 'Diberikan kepada', height - 210, sans, 13, COLOR.ink500);
  centered(
    page,
    params.learnerName,
    height - 262,
    serif,
    fitSize(serif, params.learnerName, width - 180, 40),
  );
  page.drawLine({
    start: { x: width / 2 - 170, y: height - 280 },
    end: { x: width / 2 + 170, y: height - 280 },
    thickness: 1,
    color: COLOR.border,
  });
  centered(page, 'atas keberhasilan menyelesaikan kursus', height - 314, sans, 13, COLOR.ink500);
  centered(
    page,
    params.courseTitle,
    height - 352,
    serif,
    fitSize(serif, params.courseTitle, width - 180, 26),
  );
  if (params.averageScore !== null) {
    centered(
      page,
      `dengan nilai rata-rata ${params.averageScore}`,
      height - 384,
      serifItalic,
      14,
      COLOR.ink500,
    );
  }

  const date = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeZone: 'Asia/Jakarta',
  }).format(params.issuedAt);
  page.drawText(sanitize(`Diterbitkan ${date}`), {
    x: 64,
    y: 72,
    size: 11,
    font: sans,
    color: COLOR.ink500,
  });
  page.drawText(`No. ${params.certificateNumber}`, {
    x: 64,
    y: 56,
    size: 10,
    font: mono,
    color: COLOR.ink500,
  });
  const tagline = 'Learn Your Way, Grow Your Future.';
  page.drawText(tagline, {
    x: width - 64 - serifItalic.widthOfTextAtSize(tagline, 12),
    y: 64,
    size: 12,
    font: serifItalic,
    color: COLOR.ink500,
  });

  return Buffer.from(await pdf.save());
}
