/**
 * Generiert Favicons & PWA-Icons aus public/vrema_logo_icon.png (VREMA-Mark).
 * Ausführen: npm run icons:generate
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import toIco from "to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "public/vrema_logo_icon.png");
const OUT = join(ROOT, "public");

async function png(size: number): Promise<Buffer> {
  return sharp(SRC)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function main() {
  const pairs: [string, number][] = [
    ["favicon-16x16.png", 16],
    ["favicon-32x32.png", 32],
    ["favicon-48x48.png", 48],
    ["apple-touch-icon.png", 180],
    ["android-chrome-192x192.png", 192],
    ["android-chrome-512x512.png", 512],
  ];

  for (const [name, size] of pairs) {
    const buf = await png(size);
    writeFileSync(join(OUT, name), buf);
    console.log("wrote", name, size);
  }

  const [b16, b32, b48] = await Promise.all([png(16), png(32), png(48)]);
  const ico = await toIco([b16, b32, b48]);
  writeFileSync(join(OUT, "favicon.ico"), ico);
  console.log("wrote favicon.ico (16+32+48)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
