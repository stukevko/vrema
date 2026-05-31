import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const logoPath = path.join(process.cwd(), "vremalogo.png");

  try {
    const buffer = await fs.readFile(logoPath);
    return new Response(buffer, {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // Datei fehlt/nicht lesbar: kontrolliertes 404 statt unhandled rejection (500).
    return new Response("Logo not found", { status: 404 });
  }
}
