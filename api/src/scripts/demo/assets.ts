/**
 * Pembuat aset dummy demo (tanpa internet, tanpa foto orang, tanpa aset berhak cipta).
 * Warna mengikuti token design system (docs/10-design-system.md §4.1). Semua dokumen & struk
 * diberi watermark jelas "DUMMY / CONTOH" / "DEMO" agar tidak disangka dokumen asli.
 */
import { degrees, PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';
import type { DemoCourse, DemoTutor } from './data';
import { QRIS_TEXT } from './data';

const TOKEN = {
  background: '#FAF8F4',
  surface: '#FFFFFF',
  muted: '#F1EDE5',
  ink900: '#231F1A',
  ink700: '#4A443C',
  ink500: '#7A7267',
  border: '#E4DFD5',
  primary100: '#F3E1D6',
  primary600: '#C15F3C',
  success100: '#E1EBE3',
  success600: '#4A7C59',
  warning100: '#F3E7CF',
  warning600: '#B4842A',
  info100: '#DEE9EF',
  info600: '#3D6B8A',
};
const ACCENT = {
  primary: [TOKEN.primary100, TOKEN.primary600],
  info: [TOKEN.info100, TOKEN.info600],
  success: [TOKEN.success100, TOKEN.success600],
  warning: [TOKEN.warning100, TOKEN.warning600],
} as const;

const SERIF = "Fraunces, Georgia, 'Times New Roman', serif";
const SANS = "'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Bungkus teks per jumlah karakter (perkiraan lebar huruf) */
function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if ((line + ' ' + word).trim().length > max && line) {
      lines.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines;
}

const rupiah = (value: number) => `Rp${value.toLocaleString('id-ID')}`;

// ---------- sampul kursus (SVG 1200×675, 16:9) ----------

export function courseCoverSvg(course: DemoCourse): string {
  const [soft, strong] = ACCENT[course.cover.accent];
  const lines = wrap(course.title, 25).slice(0, 3);
  const titleSize = lines.length > 2 ? 64 : 76;
  const startY = 330 - (lines.length - 1) * (titleSize * 0.6);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${esc(course.title)}">
  <rect width="1200" height="675" fill="${TOKEN.background}"/>
  <rect x="0" y="0" width="28" height="675" fill="${strong}"/>
  <circle cx="1040" cy="560" r="260" fill="${soft}"/>
  <path d="M0 560 C220 470 380 640 640 540 S1020 430 1200 500" fill="none" stroke="${TOKEN.border}" stroke-width="6"/>
  <path d="M0 610 C260 520 420 690 700 590 S1060 500 1200 560" fill="none" stroke="${soft}" stroke-width="22"/>
  <text x="96" y="150" font-family="${SANS}" font-size="28" font-weight="700" letter-spacing="3" fill="${strong}">${esc(course.cover.kicker.toUpperCase())}</text>
  ${lines.map((line, i) => `<text x="96" y="${startY + i * titleSize * 1.15}" font-family="${SERIF}" font-size="${titleSize}" font-weight="600" fill="${TOKEN.ink900}">${esc(line)}</text>`).join('\n  ')}
  <text x="96" y="600" font-family="${SERIF}" font-size="34" font-weight="600" fill="${TOKEN.ink700}">Learnly<tspan fill="${TOKEN.primary600}">.</tspan></text>
</svg>
`;
}

// ---------- struk transfer dummy (SVG 720×1080) ----------

export interface ReceiptInput {
  payer: string;
  amount: number;
  date: string;
  reference: string;
  note: string;
}

export function receiptSvg(input: ReceiptInput): string {
  const rows: [string, string][] = [
    ['Waktu', input.date],
    ['Rekening tujuan', 'BCA 1234567890'],
    ['Nama penerima', 'PT Learnly Demo'],
    ['Pengirim', input.payer],
    ['Berita', input.note],
    ['No. referensi', input.reference],
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1080" viewBox="0 0 720 1080" role="img" aria-label="Struk transfer contoh">
  <rect width="720" height="1080" fill="${TOKEN.muted}"/>
  <rect x="40" y="40" width="640" height="1000" rx="28" fill="${TOKEN.surface}" stroke="${TOKEN.border}" stroke-width="2"/>
  <circle cx="360" cy="170" r="54" fill="${TOKEN.success100}"/>
  <path d="M332 170 l20 20 l38 -40" fill="none" stroke="${TOKEN.success600}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="360" y="275" text-anchor="middle" font-family="${SANS}" font-size="30" font-weight="700" fill="${TOKEN.ink900}">Transfer Berhasil</text>
  <text x="360" y="340" text-anchor="middle" font-family="${SANS}" font-size="54" font-weight="800" fill="${TOKEN.ink900}">${esc(rupiah(input.amount))}</text>
  <line x1="90" y1="390" x2="630" y2="390" stroke="${TOKEN.border}" stroke-width="2" stroke-dasharray="10 8"/>
  ${rows
    .map(
      ([label, value], i) => `<text x="90" y="${450 + i * 70}" font-family="${SANS}" font-size="22" fill="${TOKEN.ink500}">${esc(label)}</text>
  <text x="630" y="${450 + i * 70}" text-anchor="end" font-family="${SANS}" font-size="24" font-weight="600" fill="${TOKEN.ink900}">${esc(value)}</text>`,
    )
    .join('\n  ')}
  <text x="360" y="935" text-anchor="middle" font-family="${SANS}" font-size="20" fill="${TOKEN.ink500}">Struk contoh untuk demo aplikasi Learnly — bukan bukti transaksi asli.</text>
  <text x="360" y="640" text-anchor="middle" transform="rotate(-28 360 640)" font-family="${SANS}" font-size="170" font-weight="800" fill="${TOKEN.primary600}" fill-opacity="0.13">DEMO</text>
</svg>
`;
}

// ---------- QRIS contoh (SVG) ----------

export async function qrisSvg(): Promise<string> {
  const qr = QRCode.create(QRIS_TEXT, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const cell = 420 / size;
  const rects: string[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (qr.modules.get(r, c)) rects.push(`<rect x="${(150 + c * cell).toFixed(2)}" y="${(230 + r * cell).toFixed(2)}" width="${(cell + 0.3).toFixed(2)}" height="${(cell + 0.3).toFixed(2)}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="900" viewBox="0 0 720 900" role="img" aria-label="QRIS contoh Learnly Demo">
  <rect width="720" height="900" fill="${TOKEN.surface}"/>
  <rect x="24" y="24" width="672" height="852" rx="24" fill="none" stroke="${TOKEN.border}" stroke-width="3"/>
  <text x="360" y="110" text-anchor="middle" font-family="${SANS}" font-size="44" font-weight="800" letter-spacing="4" fill="${TOKEN.ink900}">QRIS CONTOH</text>
  <text x="360" y="160" text-anchor="middle" font-family="${SANS}" font-size="26" font-weight="600" fill="${TOKEN.ink700}">LEARNLY DEMO</text>
  <rect x="130" y="210" width="460" height="460" fill="${TOKEN.surface}" stroke="${TOKEN.border}" stroke-width="2"/>
  <g fill="${TOKEN.ink900}">${rects.join('')}</g>
  <text x="360" y="740" text-anchor="middle" font-family="${SANS}" font-size="22" fill="${TOKEN.primary600}" font-weight="700">BUKAN QRIS ASLI — HANYA UNTUK DEMO</text>
  <text x="360" y="780" text-anchor="middle" font-family="${SANS}" font-size="20" fill="${TOKEN.ink500}">Isi kode: ${QRIS_TEXT}. Ganti dengan QRIS resmi merchant</text>
  <text x="360" y="810" text-anchor="middle" font-family="${SANS}" font-size="20" fill="${TOKEN.ink500}">di Admin → Pengaturan sebelum menerima pembayaran sungguhan.</text>
</svg>
`;
}

// ---------- PDF (pdf-lib, font standar WinAnsi) ----------

const hex = (value: string) =>
  rgb(parseInt(value.slice(1, 3), 16) / 255, parseInt(value.slice(3, 5), 16) / 255, parseInt(value.slice(5, 7), 16) / 255);

/** Font standar PDF hanya WinAnsi → ganti karakter di luar itu */
function pdfText(text: string): string {
  return text
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
    .replace(/₄/g, '4')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/×/g, 'x')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

function watermark(page: PDFPage, font: PDFFont, text: string) {
  const { width, height } = page.getSize();
  const size = Math.min(width, height) / 5.5;
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: width / 2 - (textWidth / 2) * Math.cos(Math.PI / 7),
    y: height / 2 - (textWidth / 2) * Math.sin(Math.PI / 7),
    size,
    font,
    color: hex(TOKEN.primary600),
    opacity: 0.14,
    rotate: degrees(180 / 7),
  });
}

function drawParagraph(page: PDFPage, font: PDFFont, text: string, x: number, y: number, size: number, maxChars: number, color = TOKEN.ink700) {
  let cursor = y;
  for (const paragraph of pdfText(text).split('\n')) {
    for (const line of wrap(paragraph, maxChars)) {
      page.drawText(line, { x, y: cursor, size, font, color: hex(color) });
      cursor -= size * 1.5;
    }
    cursor -= size * 0.5;
  }
  return cursor;
}

/** Metadata tanggal tetap agar file hasil generate identik setiap dijalankan (deterministik) */
const FIXED_DATE = new Date('2026-01-01T00:00:00.000Z');
function stamp(pdf: PDFDocument) {
  pdf.setCreationDate(FIXED_DATE);
  pdf.setModificationDate(FIXED_DATE);
  pdf.setProducer('Learnly demo assets');
  pdf.setCreator('generate-demo-assets');
}

async function fonts(pdf: PDFDocument) {
  return {
    serif: await pdf.embedFont(StandardFonts.TimesRomanBold),
    sans: await pdf.embedFont(StandardFonts.Helvetica),
    sansBold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
}

/** Ijazah / sertifikat dummy tutor (A4 landscape) */
export async function tutorDocumentPdf(tutor: DemoTutor, doc: DemoTutor['documents'][number]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(pdfText(`${doc.title} - ${tutor.fullName} (DUMMY)`));
  pdf.setAuthor('Learnly Demo');
  stamp(pdf);
  const page = pdf.addPage([842, 595]);
  const f = await fonts(pdf);
  page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: hex(TOKEN.background) });
  page.drawRectangle({ x: 28, y: 28, width: 786, height: 539, borderColor: hex(TOKEN.primary600), borderWidth: 3 });
  page.drawRectangle({ x: 40, y: 40, width: 762, height: 515, borderColor: hex(TOKEN.border), borderWidth: 1 });
  const center = (text: string, y: number, font: PDFFont, size: number, color = TOKEN.ink900) => {
    const safe = pdfText(text);
    page.drawText(safe, { x: 421 - font.widthOfTextAtSize(safe, size) / 2, y, size, font, color: hex(color) });
  };
  center(doc.issuer.toUpperCase(), 490, f.sansBold, 14, TOKEN.ink500);
  center(doc.kind === 'ijazah' ? 'IJAZAH' : 'SERTIFIKAT', 430, f.serif, 44);
  center(doc.title, 395, f.sans, 16, TOKEN.ink700);
  center('diberikan kepada', 340, f.sans, 13, TOKEN.ink500);
  center(tutor.fullName, 295, f.serif, 34);
  center(tutor.education, 255, f.sans, 13, TOKEN.ink700);
  center(`Diterbitkan ${doc.issuedAt}`, 200, f.sans, 12, TOKEN.ink500);
  center('DOKUMEN CONTOH UNTUK DEMO APLIKASI LEARNLY - TIDAK BERLAKU SEBAGAI DOKUMEN RESMI', 70, f.sansBold, 10, TOKEN.primary600);
  watermark(page, f.sansBold, 'DUMMY / CONTOH');
  return Buffer.from(await pdf.save());
}

/** Materi lesson & file tugas siswa (A4 portrait) */
export async function textPdf(params: { kicker: string; title: string; body: string; footer: string; watermarkText?: string }): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(pdfText(params.title));
  pdf.setAuthor('Learnly Demo');
  stamp(pdf);
  const page = pdf.addPage([595, 842]);
  const f = await fonts(pdf);
  page.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: hex(TOKEN.primary100) });
  page.drawText(pdfText(params.kicker.toUpperCase()), { x: 48, y: 812, size: 11, font: f.sansBold, color: hex(TOKEN.primary600) });
  let y = 740;
  for (const line of wrap(pdfText(params.title), 42)) {
    page.drawText(line, { x: 48, y, size: 24, font: f.serif, color: hex(TOKEN.ink900) });
    y -= 30;
  }
  drawParagraph(page, f.sans, params.body, 48, y - 12, 11.5, 88);
  page.drawText(pdfText(params.footer), { x: 48, y: 40, size: 9, font: f.sans, color: hex(TOKEN.ink500) });
  if (params.watermarkText) watermark(page, f.sansBold, params.watermarkText);
  return Buffer.from(await pdf.save());
}

export { rupiah };
