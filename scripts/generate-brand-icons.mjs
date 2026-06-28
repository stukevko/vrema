/**
 * PWA/Favicon-Größen aus vrema-mark-petrol.png (Kreis-V).
 * Zuerst PNGs trimmen (sonst winzig in der UI wegen 1408×768 Leerraum).
 * node scripts/generate-brand-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const PETROL = { r: 10, g: 58, b: 82, alpha: 1 };

async function trimMarkFile(name) {
  const file = join(publicDir, name);
  const trimmed = await sharp(file).trim({ threshold: 35 }).png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const side = Math.max(meta.width ?? 0, meta.height ?? 0);
  const pad = Math.round(side * 0.06);
  const out = await sharp(trimmed)
    .extend({
      top: pad + Math.floor((side - (meta.height ?? 0)) / 2),
      bottom: pad + Math.ceil((side - (meta.height ?? 0)) / 2),
      left: pad + Math.floor((side - (meta.width ?? 0)) / 2),
      right: pad + Math.ceil((side - (meta.width ?? 0)) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  writeFileSync(file, out);
  console.log("✓ trimmed", name);
}

await trimMarkFile("vrema-mark-petrol.png");
await trimMarkFile("vrema-mark-white.png");

const source = readFileSync(join(publicDir, "vrema-mark-petrol.png"));

const sizes = {
  "favicon-16x16.png": 16,
  "favicon-32x32.png": 32,
  "apple-touch-icon.png": 180,
  "android-chrome-192x192.png": 192,
  "android-chrome-512x512.png": 512,
};

for (const [name, size] of Object.entries(sizes)) {
  const inner = Math.round(size * 0.82);
  const pad = Math.floor((size - inner) / 2);
  const icon = await sharp(source).resize(inner, inner, { fit: "contain" }).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: PETROL },
  })
    .composite([{ input: icon, top: pad, left: pad }])
    .png()
    .toFile(join(publicDir, name));
  console.log("✓", name);
}
