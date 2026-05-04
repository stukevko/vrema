import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Liefert das hochgeladene Profilbild (Data-URL in DB) als Binärantwort.
 * OAuth-Avatare bleiben direkt als https-URL in der Session — diese Route nur für Uploads.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || userId.startsWith("affiliate:")) {
    return new Response(null, { status: 401 });
  }

  const row = await db.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });

  const raw = row?.image;
  if (!raw?.startsWith("data:")) {
    return new Response(null, { status: 404 });
  }

  const m = /^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/i.exec(raw);
  if (!m) {
    return new Response(null, { status: 404 });
  }

  const body = Buffer.from(m[2].replace(/\s/g, ""), "base64");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": m[1],
      "Cache-Control": "private, no-store",
    },
  });
}
