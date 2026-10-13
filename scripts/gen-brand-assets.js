/* eslint-disable @typescript-eslint/no-require-imports */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ICON_SVG = path.join(ROOT, "public/brand/icon.svg");
const LOGO_PNG = path.join(ROOT, "public/brand/Logo Horizontal.png");
const ICONS_DIR = path.join(ROOT, "public/icons");
const BRAND_DIR = path.join(ROOT, "public/brand");

const FAVICON_SIZES = [16, 32, 48, 64, 180, 192, 512];

function outName(size) {
  if (size === 180) return "apple-touch-icon.png";
  if (size === 192) return "android-chrome-192x192.png";
  if (size === 512) return "android-chrome-512x512.png";
  return `favicon-${size}x${size}.png`;
}

// Minimal ICO container embedding PNG-compressed images (supported since Windows Vista).
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + dirEntrySize * count;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  const imageBuffers = [];
  for (const { size, buffer } of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 = 256)
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // offset
    offset += buffer.length;
    dirEntries.push(entry);
    imageBuffers.push(buffer);
  }
  return Buffer.concat([header, ...dirEntries, ...imageBuffers]);
}

async function main() {
  fs.mkdirSync(ICONS_DIR, { recursive: true });

  // 1. Rasterize the icon SVG at every required favicon size.
  const pngsForIco = [];
  for (const size of FAVICON_SIZES) {
    const buffer = await sharp(ICON_SVG, { density: 384 }).resize(size, size).png().toBuffer();
    fs.writeFileSync(path.join(ICONS_DIR, outName(size)), buffer);
    if ([16, 32, 48].includes(size)) pngsForIco.push({ size, buffer });
    console.log("wrote", outName(size));
  }

  // 2. Build a real multi-resolution favicon.ico (16/32/48) for legacy browser/OS chrome.
  const ico = buildIco(pngsForIco);
  fs.writeFileSync(path.join(ROOT, "src/app/favicon.ico"), ico);
  console.log("wrote src/app/favicon.ico");

  // 3. Also drop a crisp 512 icon PNG + the SVG into public/brand for general reuse.
  await sharp(ICON_SVG, { density: 384 }).resize(512, 512).png().toFile(path.join(BRAND_DIR, "icon.png"));
  console.log("wrote public/brand/icon.png");

  // 4. Trim + chroma-key the horizontal logo PNG (opaque near-white bg -> transparent),
  // and recolor the brand-color pixels to the current brand hex (BRAND_HEX below).
  const BRAND_HEX = { r: 0xf2, g: 0x36, b: 0x6c }; // #F2366C — update here when the brand color changes
  const trimmed = await sharp(LOGO_PNG).trim({ background: "#ffffff", threshold: 10 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = trimmed;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // distance from white; keep saturated brand-color pixels opaque, fade near-white to transparent
    const brightness = (r + g + b) / 3;
    if (brightness > 240) {
      data[i + 3] = 0;
    } else if (brightness > 200) {
      // soft edge anti-aliasing falloff
      const alpha = Math.max(0, 255 - Math.round(((brightness - 200) / 40) * 255));
      data[i + 3] = Math.min(data[i + 3], alpha);
    }
    if (data[i + 3] > 0) {
      // recolor whatever's left (the mark itself) to the current brand hex
      data[i] = BRAND_HEX.r;
      data[i + 1] = BRAND_HEX.g;
      data[i + 2] = BRAND_HEX.b;
    }
  }
  const horizontalOut = path.join(BRAND_DIR, "logo-horizontal.png");
  await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).png().toFile(horizontalOut);
  console.log("wrote public/brand/logo-horizontal.png", info.width, "x", info.height);

  // 5. Also emit a lightweight optimized copy of the icon SVG at the top level for <link rel="icon">.
  fs.copyFileSync(ICON_SVG, path.join(ICONS_DIR, "icon.svg"));

  // 6. Simple 1200x630 Open Graph / social share image: brand-tinted background + centered logo lockup.
  const ogWidth = 1200, ogHeight = 630;
  const logoMeta = await sharp(horizontalOut).metadata();
  const logoTargetWidth = 640;
  const logoTargetHeight = Math.round((logoMeta.height / logoMeta.width) * logoTargetWidth);
  const logoResized = await sharp(horizontalOut).resize(logoTargetWidth, logoTargetHeight).toBuffer();
  const ogBg = await sharp({
    create: { width: ogWidth, height: ogHeight, channels: 4, background: "#F8FAFC" },
  })
    .composite([{ input: logoResized, left: Math.round((ogWidth - logoTargetWidth) / 2), top: Math.round((ogHeight - logoTargetHeight) / 2) }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(ROOT, "public/og-image.png"), ogBg);
  console.log("wrote public/og-image.png");

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
