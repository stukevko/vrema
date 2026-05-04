import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const icoPath = path.join(process.cwd(), "favicon.ico");
  const buffer = await fs.readFile(icoPath);

  return new Response(buffer, {
    headers: {
      "content-type": "image/x-icon",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
