// Export printable PDFs of the model answers from the app's print route.
// Usage: node export_pdf.mjs [baseUrl]   (default http://localhost:4173/ — run `npm run preview` in app/ first)
import { chromium } from '../../app/node_modules/playwright/index.mjs';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const base = process.argv[2] || 'http://localhost:4173/';
const out = join(here, '..', '..', 'de-thi', 'loi-giai', 'pdf');
mkdirSync(out, { recursive: true });
const sols = JSON.parse(readFileSync(join(here, '..', '..', 'app', 'src', 'data', 'solutions.json'), 'utf8'));
const pdfOpts = { format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '18mm', left: '15mm', right: '15mm' },
  displayHeaderFooter: true, headerTemplate: '<span></span>',
  footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#777;font-family:sans-serif"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' };

const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
for (const s of sols) {
  await p.goto(`${base}#/in/bai-mau/${s.id}`);
  await p.waitForSelector('article');
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: join(out, `${s.id}.pdf`), ...pdfOpts });
  process.stdout.write('.');
}
await p.goto(`${base}#/in/bai-mau/all`);
await p.waitForSelector('article');
await p.evaluate(() => document.fonts.ready);
const nums = sols.map((s) => s.number);
const combined = `VSTEP-VLU-${Math.min(...nums)}-${Math.max(...nums)}-bai-mau.pdf`;
await p.pdf({ path: join(out, combined), ...pdfOpts, timeout: 0 });
await b.close();
console.log(`\nexported ${sols.length} exam PDFs + ${combined}`, errs.length ? errs : '');
