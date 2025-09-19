const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

(async () => {
  const src = path.resolve('assets/blazeKey-tp-bg.png');
  if (!fs.existsSync(src)) {
    console.error('Missing source image at assets/blazeKey-tp-bg.png');
    process.exit(1);
  }

  const ensure = (p) => fs.mkdirSync(p, { recursive: true });
  ensure('public');

  // Trim transparent borders and add a tiny safety margin so the glow isn't clipped.
  // marginRatio controls "zoom" (lower margin = bigger appearance). Try 0.02–0.06.
  const marginRatio = 0.03;

  const prepareBase = async () => {
    // Remove uniform transparent padding around the image
    const trimmedBuf = await sharp(src).png().trim().toBuffer();
    const trimmed = sharp(trimmedBuf);
    const md = await trimmed.metadata();
    const m = Math.max(1, Math.round(Math.max(md.width || 0, md.height || 0) * marginRatio));
    // Add a small transparent margin back to avoid cropping the outer glow
    const padded = await trimmed
      .extend({ top: m, bottom: m, left: m, right: m, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    return sharp(padded);
  };

  const makeSquare = async (size, dest, fit='cover') => {
    const base = await prepareBase();
    await base
      .resize(size, size, { fit, position: 'centre', background: { r:0, g:0, b:0, alpha:0 } })
      .png()
      .toFile(dest);
  };

  // Public-only outputs (no app/ or src/app writes)
  await makeSquare(180, 'public/apple-touch-icon.png');   // iOS
  await makeSquare(192, 'public/android-chrome-192x192.png');
  await makeSquare(512, 'public/android-chrome-512x512.png');

  // ICO (16/32/48) — generated from the same zoomed base
  const sizes = [16, 32, 48];
  const tmp = [];
  for (const s of sizes) {
    const p = `public/favicon-${s}.png`;
    await makeSquare(s, p);
    tmp.push(p);
  }
  const ico = await pngToIco(tmp);
  fs.writeFileSync('public/favicon.ico', ico);

  // Keep existing manifest style
  fs.writeFileSync('public/site.webmanifest', JSON.stringify({
    name: 'blazeKey',
    short_name: 'blazeKey',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    theme_color: '#0b0b0f',
    background_color: '#0b0b0f',
    display: 'standalone'
  }, null, 2));

  console.log('✅ Icons regenerated with reduced padding (larger apparent size).');
})();
