/**
 * PWA/Favicon-Größen aus vrema-mark-petrol.png (Kreis-V).
 * node scripts/generate-brand-icons.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const source = readFileSync(join(publicDir, "vrema-mark-petrol.png"));
const PETROL = { r: 10, g: 58, b: 82, alpha: 1 };

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
