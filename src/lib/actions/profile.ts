"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant, tenantWhere } from "@/lib/tenant-guard";
import { detectImageMime } from "@/lib/image-sniff";

const MAX_UPLOAD_BYTES = 280 * 1024;
const MAX_DATA_URL_CHARS = 320_000;

export async function updateUserProfileAvatar(formData: FormData) {
  const { userId, companyId } = await requireTenant();

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    throw new Error("Keine Bilddatei übermittelt.");
  }
  if (file.size === 0) {
    throw new Error("Die Datei ist leer.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Maximal 280 KB (bitte kleineres Bild wählen oder zuschneiden).");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = detectImageMime(buf);
  if (!mime) {
    throw new Error("Nur JPEG-, PNG- oder WebP-Bilder sind erlaubt.");
  }

  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error("Das Bild ist nach der Verarbeitung zu groß.");
  }

  await db.user.update({
    where: tenantWhere(companyId, { id: userId }),
    data: { image: dataUrl },
  });

  revalidatePath("/", "layout");
  revalidatePath("/dashboard/settings");
}

export async function removeUserProfileAvatar() {
  const { userId, companyId } = await requireTenant();

  await db.user.update({
    where: tenantWhere(companyId, { id: userId }),
    data: { image: null },
  });

  revalidatePath("/", "layout");
  revalidatePath("/dashboard/settings");
}
