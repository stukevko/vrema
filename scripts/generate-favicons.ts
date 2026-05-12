/**
 * Favicons & PWA-Icons aus dem echten VREMA-Mark (bunte Balken).
 *
 * Quelle: public/vrema-mark-favicon-source.png (Lockup-Screenshot: Icon links + Schrift).
 * Es wird nur der linke quadratische Mark-Ausschnitt verwendet, dann auf weißem Grund skaliert.
 *
 * Ausführen: npm run icons:generate
 */
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import toIco from "to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public");
/** Screenshot / Export mit Icon links (Lockup). */
const LOCKUP = join(OUT, "vrema-mark-favicon-source.png");
/** Fallback, falls Lockup fehlt. */
const FALLBACK = join(OUT, "vrema_logo_icon.png");

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 as const };

async function squareMarkPng(): Promise<Buffer> {
  const srcPath = existsSync(LOCKUP) ? LOCKUP : FALLBACK;
  if (!existsSync(srcPath)) {
    throw new Error(`Keine Favicon-Quelle: weder ${LOCKUP} noch ${FALLBACK}`);
  }

  const trimmed = await sharp(srcPath).ensureAlpha().trim({ threshold: 14 }).png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const iw = meta.width ?? 0;
  const ih = meta.height ?? 0;
  if (!iw || !ih) throw new Error("Konnte Bildgröße nicht lesen.");

  let left = 0;
  let top = 0;
  /** Quadratischer Ausschnitt (max. möglich im Bild). */
  let side = Math.min(iw, ih);

  // Breites Lockup: Icon links ≈ Hälfte der Breite, Höhe = Zeilenhöhe.
  if (iw > ih * 1.12) {
    side = Math.min(ih, Math.round(iw * 0.5));
    top = Math.max(0, Math.floor((ih - side) / 2));
    left = 0;
  } else if (ih > iw * 1.12) {
    side = Math.min(iw, Math.round(ih * 0.5));
    left = Math.max(0, Math.floor((iw - side) / 2));
    top = 0;
  }

  side = Math.max(1, Math.min(side, iw - left, ih - top));

  return sharp(trimmed).extract({ left, top, width: side, height: side }).png().toBuffer();
}

async function renderIcon(mark: Buffer, size: number): Promise<Buffer> {
  return sharp(mark)
    .resize(size, size, {
      fit: "contain",
      position: "centre",
      background: WHITE,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function main() {
  const mark = await squareMarkPng();
  writeFileSync(join(OUT, "vrema_logo_icon.png"), await renderIcon(mark, 512));
  console.log("wrote vrema_logo_icon.png (512, für E-Mail / OG-Kleinformat)");

  const rootLogo = join(ROOT, "vremalogo.png");
  writeFileSync(rootLogo, await renderIcon(mark, 512));
  console.log("wrote vremalogo.png (API /assets/logo)");

  const pairs: [string, number][] = [
    ["favicon-16x16.png", 16],
    ["favicon-32x32.png", 32],
    ["favicon-48x48.png", 48],
    ["apple-touch-icon.png", 180],
    ["android-chrome-192x192.png", 192],
    ["android-chrome-512x512.png", 512],
  ];

  for (const [name, size] of pairs) {
    const buf = await renderIcon(mark, size);
    writeFileSync(join(OUT, name), buf);
    console.log("wrote", name, size);
  }

  const [b16, b32, b48] = await Promise.all([
    renderIcon(mark, 16),
    renderIcon(mark, 32),
    renderIcon(mark, 48),
  ]);
  const ico = await toIco([b16, b32, b48]);
  writeFileSync(join(OUT, "favicon.ico"), ico);
  console.log("wrote favicon.ico (16+32+48)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
