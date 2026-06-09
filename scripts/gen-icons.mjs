// Generates Tempo brand app icons from the SVG mark (replaces the default Expo
// placeholder icons). Run with: node scripts/gen-icons.mjs
import sharp from 'sharp';

const DARK = '#0B0F17';
const VOLT = '#C5F82A';
const TRACK = '#1E2632';

// Full rounded-square icon (dark bg + volt progress ring).
const fullIcon = `<svg width="1024" height="1024" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="16" fill="${DARK}"/>
  <circle cx="32" cy="32" r="17" stroke="${TRACK}" stroke-width="6" fill="none"/>
  <path d="M32 15 a17 17 0 0 1 14.7 25.5" stroke="${VOLT}" stroke-width="6" stroke-linecap="round" fill="none"/>
  <circle cx="32" cy="32" r="4" fill="${VOLT}"/>
</svg>`;

// Mark only, padded into the central safe zone (transparent bg) for Android
// adaptive foreground and the splash logo.
const mark = `<svg width="1024" height="1024" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(13 13) scale(0.59)">
    <circle cx="32" cy="32" r="17" stroke="${TRACK}" stroke-width="6" fill="none"/>
    <path d="M32 15 a17 17 0 0 1 14.7 25.5" stroke="${VOLT}" stroke-width="6" stroke-linecap="round" fill="none"/>
    <circle cx="32" cy="32" r="4" fill="${VOLT}"/>
  </g>
</svg>`;

async function png(svg, size, out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log('wrote', out, `(${size}px)`);
}

const dir = 'assets/images';
await png(fullIcon, 1024, `${dir}/icon.png`);
await png(fullIcon, 48, `${dir}/favicon.png`);
await png(mark, 1024, `${dir}/adaptive-icon.png`);
await png(mark, 1024, `${dir}/splash-icon.png`);
console.log('done');
