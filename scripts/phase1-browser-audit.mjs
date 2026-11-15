// Phase 1 screenshot and browser console audit. Run with: node scripts/phase1-browser-audit.mjs
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.AUDIT_BASE || 'http://127.0.0.1:8796';
const pages = ['index', 'about', 'portfolio', 'decoration', 'catering', 'services', 'liked-designs', 'contact', 'admin', 'setup', '404'];
const widths = [360, 768, 1366];
await mkdir('audit/screenshots', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const report = [];
for (const pageName of pages) for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = [], failed = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', req => failed.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText}`));
  const url = pageName === 'index' ? `${base}/` : pageName === '404' ? `${base}/__audit_missing__` : `${base}/${pageName}.html`;
  let status = null;
  try { status = (await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 }))?.status() ?? null; }
  catch (error) { errors.push(`NAVIGATION: ${error.message}`); }
  await page.screenshot({ path: `audit/screenshots/${pageName}-${width}.png`, fullPage: true, timeout: 20000 }).catch(error => errors.push(`SCREENSHOT: ${error.message}`));
  const state = await page.evaluate(() => ({ title: document.title, bodyText: document.body?.innerText?.slice(0, 120), images: [...document.images].map(i => ({src:i.currentSrc||i.src,complete:i.complete,naturalWidth:i.naturalWidth,loading:i.loading,alt:i.alt})), horizontalOverflow: document.documentElement.scrollWidth > innerWidth } )).catch(() => null);
  report.push({ page: pageName, width, status, errors, failed, state });
  await context.close();
}
await browser.close();
await writeFile('audit/browser-results.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.map(({page,width,status,errors,failed,state})=>({page,width,status,errorCount:errors.length,failedCount:failed.length,overflow:state?.horizontalOverflow,images:state?.images?.length,body:state?.bodyText})), null, 2));
