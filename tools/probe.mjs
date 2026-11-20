// Load a page with headless Chromium, report failed/external requests + console errors
import { chromium } from 'playwright';
const url = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const ext = new Set(), fails = [], errs = [];
page.on('request', r => { const u = r.url(); if (!u.startsWith('http://localhost')) ext.add(u.split('?')[0]); });
page.on('response', r => { if (r.status() >= 400) fails.push(r.status() + ' ' + r.url()); });
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
page.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 200)));
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => errs.push('GOTO ' + e.message));
await page.waitForTimeout(3000);
const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 1200);
if (process.argv[3]) await page.screenshot({ path: process.argv[3], fullPage: false });
console.log(JSON.stringify({ text, external: [...ext], fails, errs }, null, 1));
await browser.close();
