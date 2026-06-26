/**
 * Favicons/PWA-Icons aus brand-tile.svg (Petrol + weißes V) — scharf & kontrastreich.
 * Ausführen nach Logo-Änderungen: node scripts/generate-brand-icons.mjs
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const svg = readFileSync(join(publicDir, "brand-tile.svg"));

const sizes = {
  "favicon-16x16.png": 16,
  "favicon-32x32.png": 32,
  "apple-touch-icon.png": 180,
  "android-chrome-192x192.png": 192,
  "android-chrome-512x512.png": 512,
  "favicon.png": 512,
};

for (const [name, size] of Object.entries(sizes)) {
  await sharp(svg).resize(size, size).png().toFile(join(publicDir, name));
  console.log("✓", name);
}

try {
  const icoBuf = execFileSync(
    "npx",
    ["--yes", "to-ico", "favicon-16x16.png", "favicon-32x32.png"],
    { cwd: publicDir, encoding: "buffer", stdio: ["ignore", "pipe", "inherit"] },
  );
  writeFileSync(join(publicDir, "favicon.ico"), icoBuf);
  console.log("✓ favicon.ico");
} catch (err) {
  console.warn("favicon.ico: to-ico übersprungen — PNG-Favicons reichen.");
}
