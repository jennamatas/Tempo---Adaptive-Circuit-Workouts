// Generates favicon / app-icon / Open-Graph assets from the Tempo brand mark.
// Run: node scripts/gen-brand-assets.mjs
// Source of truth: brand colors below match app/lib/theme.ts and assets/brand/tempo-mark.svg.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG = path.join(ROOT, 'assets', 'images');

const BG = '#0B0F17';        // background / dark
const RING_TRACK = '#1E2632'; // muted ring track
const LIME = '#C5F82A';      // primary accent

// The brand mark (a tempo/stopwatch ring) drawn into an arbitrary square `s`.
// `pad` insets the artwork so it breathes inside maskable icons & OG art.
function markSvg(s, { rounded = true, pad = 0.16 } = {}) {
  const r = s * 0.5;
  const cx = r;
  const cy = r;
  const ringR = r * (1 - pad - 0.06);
  const stroke = s * 0.095;
  const dotR = s * 0.06;
  // 90% sweep of lime arc starting at top, going clockwise.
  const start = -Math.PI / 2;
  const end = start + Math.PI * 1.5;
  const x1 = cx + ringR * Math.cos(start);
  const y1 = cy + ringR * Math.sin(start);
  const x2 = cx + ringR * Math.cos(end);
  const y2 = cy + ringR * Math.sin(end);
  const radius = rounded ? s * 0.22 : 0;
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${s}" height="${s}" rx="${radius}" fill="${BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${ringR}" stroke="${RING_TRACK}" stroke-width="${stroke}" fill="none"/>
  <path d="M ${x1} ${y1} A ${ringR} ${ringR} 0 1 1 ${x2} ${y2}" stroke="${LIME}" stroke-width="${stroke}" stroke-linecap="round" fill="none"/>
  <circle cx="${cx}" cy="${cy}" r="${dotR}" fill="${LIME}"/>
</svg>`;
}

// Ring mark drawn as a positioned <g> (no nested <svg>, no <rect> background)
// so it can be composited onto the OG card.
function markGroup(s, cx0, cy0, { pad = 0.14 } = {}) {
  const r = s * 0.5;
  const cx = cx0 + r;
  const cy = cy0 + r;
  const ringR = r * (1 - pad - 0.06);
  const stroke = s * 0.095;
  const dotR = s * 0.06;
  const start = -Math.PI / 2;
  const end = start + Math.PI * 1.5;
  const x1 = cx + ringR * Math.cos(start);
  const y1 = cy + ringR * Math.sin(start);
  const x2 = cx + ringR * Math.cos(end);
  const y2 = cy + ringR * Math.sin(end);
  return `<circle cx="${cx}" cy="${cy}" r="${ringR}" stroke="${RING_TRACK}" stroke-width="${stroke}" fill="none"/>
    <path d="M ${x1} ${y1} A ${ringR} ${ringR} 0 1 1 ${x2} ${y2}" stroke="${LIME}" stroke-width="${stroke}" stroke-linecap="round" fill="none"/>
    <circle cx="${cx}" cy="${cy}" r="${dotR}" fill="${LIME}"/>`;
}

// Open Graph / social card: wordmark + mark on the brand background, 1200x630.
function ogSvg(w = 1200, h = 630) {
  const markS = 168;
  const wordmarkW = 360; // approx width of "Tempo" at 88px
  const blockW = markS + 36 + wordmarkW;
  const mx = (w - blockW) / 2;
  const my = h / 2 - markS / 2 - 24;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="50%" cy="36%" r="75%">
      <stop offset="0%" stop-color="#13212c"/>
      <stop offset="100%" stop-color="${BG}"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  ${markGroup(markS, mx, my)}
  <text x="${mx + markS + 36}" y="${my + markS / 2 + 30}" font-family="-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="88" font-weight="700" fill="#F4F6FA" letter-spacing="-3">Tempo</text>
  <text x="50%" y="${h - 96}" text-anchor="middle" font-family="-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="36" font-weight="500" fill="#9BA6B5">Adaptive Circuit Workouts</text>
</svg>`;
}

async function png(svg, size, out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(IMG, out));
  console.log('  ✓', out, `(${size}×${size})`);
}

async function main() {
  await mkdir(IMG, { recursive: true });
  console.log('Generating brand assets →', path.relative(ROOT, IMG));

  // App + web icons
  await png(markSvg(1024, { rounded: false }), 1024, 'icon.png');               // iOS / general
  await png(markSvg(1024, { rounded: false, pad: 0.26 }), 1024, 'adaptive-icon.png'); // Android adaptive (safe zone)
  await png(markSvg(1024, { rounded: false, pad: 0.30 }), 1024, 'splash-icon.png');
  await png(markSvg(512, { rounded: true }), 512, 'icon-512.png');              // PWA maskable/any
  await png(markSvg(192, { rounded: true }), 192, 'icon-192.png');              // PWA
  await png(markSvg(180, { rounded: true }), 180, 'apple-touch-icon.png');      // iOS home screen
  await png(markSvg(48, { rounded: true }), 48, 'favicon.png');                 // Expo web favicon
  await png(markSvg(32, { rounded: true }), 32, 'favicon-32.png');
  await png(markSvg(16, { rounded: true }), 16, 'favicon-16.png');

  // Open Graph / Twitter card
  await sharp(Buffer.from(ogSvg())).png().toFile(path.join(IMG, 'og-image.png'));
  console.log('  ✓ og-image.png (1200×630)');

  // Multi-resolution favicon.ico (16/32/48) for legacy browsers
  const ico = await import('png-to-ico').then((m) => m.default).catch(() => null);
  if (ico) {
    const buf = await ico([
      await sharp(Buffer.from(markSvg(16, { rounded: true }))).resize(16, 16).png().toBuffer(),
      await sharp(Buffer.from(markSvg(32, { rounded: true }))).resize(32, 32).png().toBuffer(),
      await sharp(Buffer.from(markSvg(48, { rounded: true }))).resize(48, 48).png().toBuffer(),
    ]);
    await writeFile(path.join(ROOT, 'public', 'favicon.ico'), buf);
    console.log('  ✓ public/favicon.ico (16/32/48)');
  } else {
    console.log('  · skipped favicon.ico (png-to-ico not installed)');
  }
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
