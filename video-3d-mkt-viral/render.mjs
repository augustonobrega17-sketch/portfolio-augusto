// Renderiza scene.html quadro a quadro com o Chromium headless e monta o MP4 com ffmpeg.
//   node render.mjs                     -> vídeo completo (30 fps) + música
//   node render.mjs --stills 0.5,4,8    -> só alguns quadros em PNG (prévia rápida)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
// Playwright vem instalado globalmente no ambiente; createRequire acha o pacote global.
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const OUT = path.join(ROOT, 'gancho-flopou-3d.mp4');
const AUDIO = path.join(ROOT, 'trilha.wav');
const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/scene.html`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(url);
await page.waitForFunction('window.READY === true', null, { timeout: 120000 });
const duration = await page.evaluate('window.DURATION');
const stage = page.locator('#stage');

async function frameAt(t, type = 'jpeg') {
  await page.evaluate(t => window.renderAt(t), t);
  return stage.screenshot(type === 'png' ? { type: 'png' } : { type: 'jpeg', quality: 95 });
}

if (stillsArg) {
  fs.mkdirSync(path.join(ROOT, 'frames'), { recursive: true });
  for (const s of stillsArg.split(',').map(Number)) {
    fs.writeFileSync(path.join(ROOT, 'frames', `still-${s.toFixed(2)}.png`), await frameAt(s, 'png'));
    console.log('still', s);
  }
} else {
  const total = Math.round(duration * FPS);
  const hasAudio = fs.existsSync(AUDIO);
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    ...(hasAudio ? ['-i', AUDIO] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    ...(hasAudio ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-movflags', '+faststart', OUT,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    const buf = await frameAt(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 30 === 0) console.log(`quadro ${i}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('pronto:', OUT);
}
await browser.close();
server.close();
