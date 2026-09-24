/**
 * Generator Postman Collection Learnly (v2.1) + environment lokal.
 *
 *   npm run postman:build      → tulis learnly.postman_collection.json & learnly-local.postman_environment.json
 *   npm run postman:test       → build + jalankan folder skenario dengan newman (API lokal harus menyala)
 *   npm run postman:examples   → build ulang, menyisipkan response nyata dari run newman sebagai "Saved Response"
 *
 * Definisi request ada di ./requests.ts (satu sumber untuk folder per-modul & folder skenario).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { FOLDERS, NUM, REQUESTS, SCENARIO, type Auth, type RequestDef } from './requests';

const OUT_DIR = __dirname;
const COLLECTION_FILE = path.join(OUT_DIR, 'learnly.postman_collection.json');
const ENV_FILE = path.join(OUT_DIR, 'learnly-local.postman_environment.json');
export const SCENARIO_FOLDER = '00 · Skenario End-to-End (jalankan dengan Collection Runner)';

// ---------- file contoh (base64) untuk endpoint upload ----------

function pngBase64(
  width: number,
  height: number,
  draw: (x: number, y: number) => [number, number, number],
) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = draw(x, y);
      const offset = y * (width * 3 + 1) + 1 + x * 3;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
    }
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

/** Ilustrasi sederhana "struk transfer": kertas putih, header terakota, garis-garis teks abu. */
const sampleReceiptPng = () =>
  pngBase64(90, 140, (x, y) => {
    if (x < 4 || x > 85 || y < 4 || y > 135) return [250, 248, 244];
    if (y < 22) return [193, 95, 60];
    const line = [36, 50, 64, 78, 92, 106].some((row) => y >= row && y < row + 4);
    if (line && x > 12 && x < (y % 28 === 8 ? 60 : 76)) return [182, 173, 160];
    return [255, 255, 255];
  });

async function samplePdfBase64(title: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([420, 297]);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText(title, { x: 40, y: 230, size: 16, font, color: rgb(0.14, 0.12, 0.1) });
  page.drawText('Dokumen contoh untuk pengujian API Learnly', { x: 40, y: 200, size: 10, font });
  return `data:application/pdf;base64,${Buffer.from(await pdf.save()).toString('base64')}`;
}

// ---------- builder ----------

function renderBody(body: unknown) {
  return JSON.stringify(body, null, 2).replace(new RegExp(`"${NUM}(\\w+)"`, 'g'), '{{$1}}');
}

const AUTH_TOKEN: Record<Exclude<Auth, 'none'>, string> = {
  user: '{{accessToken}}',
  tutor: '{{tutorAccessToken}}',
  admin: '{{adminAccessToken}}',
  student: '{{studentAccessToken}}',
};

const AUTH_LABEL: Record<Auth, string> = {
  none: 'Tanpa login (publik)',
  user: 'Token `{{accessToken}}` — akun siswa/orang tua (diisi otomatis oleh request Login)',
  tutor: 'Token `{{tutorAccessToken}}` — akun tutor (diisi otomatis oleh "Login sebagai Tutor")',
  admin: 'Token `{{adminAccessToken}}` — akun admin (diisi otomatis oleh "Login sebagai Admin")',
  student: 'Token `{{studentAccessToken}}` — akun siswa mandiri',
};

function buildUrl(def: RequestDef) {
  const [rawPath] = def.path.split('?');
  const query = def.query?.map(([key, value, description]) => ({ key, value, description }));
  const raw = `{{baseUrl}}${rawPath}${query?.length ? `?${query.map((q) => `${q.key}=${q.value}`).join('&')}` : ''}`;
  return {
    raw,
    host: ['{{baseUrl}}'],
    path: rawPath.split('/').filter(Boolean),
    ...(query?.length ? { query } : {}),
  };
}

function buildRequest(def: RequestDef) {
  return {
    method: def.method,
    header: def.body !== undefined ? [{ key: 'Content-Type', value: 'application/json' }] : [],
    ...(def.auth === 'none'
      ? { auth: { type: 'noauth' } }
      : {
          auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: AUTH_TOKEN[def.auth], type: 'string' }],
          },
        }),
    ...(def.body !== undefined
      ? { body: { mode: 'raw', raw: renderBody(def.body), options: { raw: { language: 'json' } } } }
      : {}),
    url: buildUrl(def),
    description: `${def.description}\n\n---\n**Autentikasi:** ${AUTH_LABEL[def.auth]}`,
  };
}

function buildTestScript(def: RequestDef): string[] {
  const expected = def.expect ?? (def.method === 'POST' && def.created ? 201 : 200);
  const lines = [
    `pm.test('Status ${expected}', () => pm.response.to.have.status(${expected}));`,
    'const json = pm.response.json();',
    `pm.test('Format response envelope konsisten', () => pm.expect(json.success).to.eql(${expected < 400}));`,
  ];
  if (expected >= 400) {
    lines.push(
      "pm.test('Ada kode & pesan error', () => { pm.expect(json.error.code).to.be.a('string'); pm.expect(json.error.message).to.be.a('string'); });",
    );
  }
  if (def.setVars && Object.keys(def.setVars).length) {
    lines.push('if (json.success) {', '  const data = json.data;');
    for (const [name, expr] of Object.entries(def.setVars)) {
      lines.push(
        `  { const value = ${expr}; if (value !== undefined && value !== null) pm.environment.set('${name}', String(value)); }`,
      );
    }
    lines.push('}');
  }
  if (def.test) lines.push(...def.test);
  return lines;
}

type Example = { code: number; status: string; body: string };

function buildItem(def: RequestDef, id: string, examples: Map<string, Example>) {
  const events = [
    { listen: 'test', script: { type: 'text/javascript', exec: buildTestScript(def) } },
  ];
  if (def.pre?.length)
    events.unshift({ listen: 'prerequest', script: { type: 'text/javascript', exec: def.pre } });
  const request = buildRequest(def);
  const example = examples.get(def.key);
  return {
    id,
    name: def.name,
    event: events,
    request,
    response: example
      ? [
          {
            name: `Contoh ${example.code < 400 ? 'sukses' : 'error'} (${example.code})`,
            originalRequest: {
              method: request.method,
              header: request.header,
              body: request.body,
              url: request.url,
            },
            status: example.status,
            code: example.code,
            _postman_previewlanguage: 'json',
            header: [{ key: 'Content-Type', value: 'application/json; charset=utf-8' }],
            body: example.body,
          },
        ]
      : [],
  };
}

/** Potong token panjang di contoh response agar tidak ada kredensial "asli" di file. */
function redact(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, k)]));
  }
  if (typeof value === 'string' && /token$/i.test(key) && value.length > 24) {
    return `${value.slice(0, 16)}…(contoh, dipotong)`;
  }
  return value;
}

function loadExamples(reportPath: string | undefined): Map<string, Example> {
  const map = new Map<string, Example>();
  if (!reportPath || !fs.existsSync(reportPath)) return map;
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  for (const execution of report.run.executions ?? []) {
    const id: string = execution.item?.id ?? '';
    const response = execution.response;
    if (!id.startsWith('scenario-') || !response?.stream) continue;
    // id skenario: scenario-<key> atau scenario-<key>~<n> untuk langkah yang diulang
    const key = id.slice('scenario-'.length).split('~')[0];
    if (map.has(key)) continue;
    const text = Buffer.from(response.stream.data ?? response.stream).toString('utf8');
    let body = text;
    try {
      body = JSON.stringify(redact(JSON.parse(text)), null, 2);
    } catch {
      /* bukan JSON */
    }
    map.set(key, { code: response.code, status: response.status, body });
  }
  return map;
}

async function main() {
  const reportArg = process.argv.indexOf('--examples');
  const examples = loadExamples(reportArg > 0 ? process.argv[reportArg + 1] : undefined);
  const byKey = new Map(REQUESTS.map((def) => [def.key, def]));

  const missing = SCENARIO.flatMap((section) => section.steps).filter((key) => !byKey.has(key));
  if (missing.length)
    throw new Error(`Skenario merujuk request yang tidak ada: ${missing.join(', ')}`);

  const seen = new Map<string, number>();
  const scenarioFolder = {
    name: SCENARIO_FOLDER,
    description: [
      'Jalankan folder ini dengan **Collection Runner** (klik kanan folder → *Run folder*) untuk mereplay seluruh alur di docs/07-ssd.md secara berurutan:',
      'registrasi → onboarding & verifikasi tutor → pencarian → booking tatap muka → pembayaran manual → tracking (polling) → check-in QR → check-out + laporan → sesi online → pembatalan & refund → kursus berbayar sampai sertifikat → ulasan → notifikasi → dashboard admin.',
      '',
      'Setiap run membuat akun baru (email unik) sehingga aman dijalankan berkali-kali. Semua ID & token disimpan otomatis ke environment.',
    ].join('\n'),
    item: SCENARIO.map((section) => ({
      name: section.name,
      description: section.description,
      item: section.steps.map((key) => {
        const count = (seen.get(key) ?? 0) + 1;
        seen.set(key, count);
        // contoh response cukup disimpan di folder per-modul (menghindari duplikasi & file raksasa)
        return buildItem(
          byKey.get(key)!,
          `scenario-${key}${count > 1 ? `~${count}` : ''}`,
          new Map(),
        );
      }),
    })),
  };

  const moduleFolders = FOLDERS.map((folder) => ({
    name: folder.name,
    description: folder.description,
    item: REQUESTS.filter((def) => def.folder === folder.name).map((def) =>
      buildItem(def, def.key, examples),
    ),
  }));

  const collection = {
    info: {
      _postman_id: '6f1b3c1e-9a4d-4d2b-8f67-1e2a7c5b9d10',
      name: 'Learnly API',
      description: fs.readFileSync(path.join(OUT_DIR, 'collection-description.md'), 'utf8'),
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }] },
    variable: [
      {
        key: 'sampleImageBase64',
        value: sampleReceiptPng(),
        type: 'string',
        description: 'Gambar contoh (PNG) untuk upload bukti transfer/QRIS/tugas',
      },
      {
        key: 'samplePdfBase64',
        value: await samplePdfBase64('Ijazah S1 Pendidikan Matematika'),
        type: 'string',
        description: 'PDF contoh untuk upload dokumen tutor',
      },
    ],
    item: [scenarioFolder, ...moduleFolders],
  };

  fs.writeFileSync(COLLECTION_FILE, `${JSON.stringify(collection, null, 2)}\n`);

  const envValues: [string, string, string?][] = [
    [
      'baseUrl',
      'http://localhost:4000/api/v1',
      'Ganti dengan URL Railway untuk menguji production, mis. https://learnly-api.up.railway.app/api/v1',
    ],
    ['accessToken', '', 'Otomatis: diisi request Register/Login siswa/orang tua'],
    ['refreshToken', '', 'Otomatis: diisi request Register/Login/Refresh'],
    ['tutorAccessToken', '', 'Otomatis: diisi "Login sebagai Tutor"'],
    ['adminAccessToken', '', 'Otomatis: diisi "Login sebagai Admin"'],
    ['studentAccessToken', '', 'Otomatis: diisi "Daftar Akun Siswa Mandiri"'],
    ['adminEmail', 'admin@learnly.id', 'Akun admin dari seed (npm run db:seed)'],
    [
      'adminPassword',
      'AdminLearnly#2026',
      'Password admin seed lokal — di Railway pakai nilai SEED_ADMIN_PASSWORD',
    ],
    ['parentEmail', '', 'Otomatis: email unik dibuat saat "Daftar Akun Orang Tua"'],
    ['parentPassword', 'RahasiaOrtu123', ''],
    ['tutorEmail', '', 'Otomatis: email unik dibuat saat "Daftar Akun Tutor"'],
    ['tutorPassword', 'RahasiaTutor123', ''],
    ['studentEmail', '', 'Otomatis'],
    ['studentPassword', 'RahasiaSiswa123', ''],
    ['bookingId', '', 'Otomatis: booking tatap muka utama'],
    ['tutorProfileId', '', 'Otomatis: profil tutor yang dibuat di skenario'],
    ['courseId', '', 'Otomatis'],
    ['courseSlug', '', 'Otomatis'],
    ['paymentId', '', 'Otomatis: tagihan booking tatap muka utama'],
  ];
  const extraVars = new Set<string>();
  for (const def of REQUESTS) {
    for (const name of Object.keys(def.setVars ?? {})) extraVars.add(name);
    for (const line of [...(def.pre ?? []), ...(def.test ?? [])]) {
      for (const match of line.matchAll(/pm\.environment\.set\('(\w+)'/g)) extraVars.add(match[1]);
    }
  }
  for (const name of [...extraVars].sort()) {
    if (!envValues.some(([key]) => key === name)) envValues.push([name, '', 'Otomatis']);
  }

  const environment = {
    id: crypto
      .createHash('md5')
      .update('learnly-local')
      .digest('hex')
      .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5'),
    name: 'Learnly — Lokal',
    values: envValues.map(([key, value, description]) => ({
      key,
      value,
      type: /password|token/i.test(key) ? 'secret' : 'default',
      enabled: true,
      ...(description ? { description } : {}),
    })),
    _postman_variable_scope: 'environment',
  };
  fs.writeFileSync(ENV_FILE, `${JSON.stringify(environment, null, 2)}\n`);

  const total = REQUESTS.length;
  console.log(
    `[postman] ${total} request di ${FOLDERS.length} folder modul + ${SCENARIO.reduce((s, x) => s + x.steps.length, 0)} langkah skenario; contoh response: ${examples.size}`,
  );
  const withoutExample = REQUESTS.filter((def) => !examples.has(def.key)).map((def) => def.key);
  if (examples.size && withoutExample.length)
    console.log(`[postman] tanpa contoh: ${withoutExample.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
