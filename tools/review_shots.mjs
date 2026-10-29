// Pictures for the Journey review page (2026-10-29): opens each version in a hidden Chrome, scrolls to
// a few depths and saves a frame, so the review page shows the versions instead of describing them.
//   node tools/review_shots.mjs [version ...]     (the site's server must be running on 8642)
// Writes design 2/new/shots/<version>-<n>.jpg. Uses Chrome's own remote control; nothing to install.
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'design 2', 'new', 'shots');
const BASE = 'http://127.0.0.1:8642/journey/new/';
const ALL = ['journey', 'globe-paper', 'globe-relief', 'globe-high', 'globe-raised', 'globe-roll'];
const DEPTHS = [0, 0.3, 0.6]; // arrival, the fold, a trip being read
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const which = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
mkdirSync(OUT, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'review-shots-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1600,1000', '--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank',
], { stdio: 'ignore' });

let ws, seq = 0;
const waiting = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++seq;
  waiting.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
  }
  if (!target) throw new Error('Chrome did not start');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { const w = waiting.get(m.id); waiting.delete(m.id); m.error ? w.rej(new Error(m.error.message)) : w.res(m.result); }
  });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  for (const v of which) {
    await send('Page.navigate', { url: `${BASE}${v}.html` });
    await sleep(4500);
    await send('Runtime.evaluate', { expression: "document.head.insertAdjacentHTML('beforeend','<style>.rv{display:none!important}</style>')" });
    for (const [n, d] of DEPTHS.entries()) {
      // scroll in small steps, as a reader would, so the page's scroll-driven parts follow
      await send('Runtime.evaluate', { awaitPromise: true, expression: `(async () => {
        const h = document.documentElement.scrollHeight - innerHeight, to = ${d} * h;
        for (let y = scrollY; Math.abs(y - to) > 4; ) { y += Math.sign(to - y) * Math.min(120, Math.abs(to - y)); scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); }
      })()` });
      await sleep(2600);
      const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 });
      writeFileSync(join(OUT, `${v}-${n}.jpg`), Buffer.from(data, 'base64'));
      console.log(`${v}-${n}.jpg`);
    }
  }
} finally {
  try { ws && ws.close(); } catch { /* closed */ }
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
