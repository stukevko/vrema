import { detectImageMime } from "@/lib/image-sniff";

/** Mindestgröße — leere/kaputte Uploads abfangen. */
export const SICK_ATTACHMENT_MIN_BYTES = 4 * 1024;
/** Gesetzlich üblich max. ~5 MB für AU-Scans. */
export const SICK_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
/** Aufbewahrung AU-Nachweise (3 Jahre). */
export const SICK_ATTACHMENT_RETENTION_YEARS = 3;

export type SickAttachmentMime = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export function detectSickAttachmentMime(buf: Buffer): SickAttachmentMime | null {
  if (buf.length >= 5 && buf.subarray(0, 5).toString("utf8") === "%PDF-") {
    return "application/pdf";
  }
  return detectImageMime(buf);
}

export function sickAttachmentRetainUntil(from = new Date()): Date {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + SICK_ATTACHMENT_RETENTION_YEARS);
  return d;
}

export function parseSickAttachmentFile(file: File): Promise<{ mime: SickAttachmentMime; dataUrl: string }> {
  return file.arrayBuffer().then((ab) => {
    const buf = Buffer.from(ab);
    if (file.size < SICK_ATTACHMENT_MIN_BYTES) {
      throw new Error("Die Datei ist zu klein — bitte ein lesbares Foto oder PDF hochladen.");
    }
    if (file.size > SICK_ATTACHMENT_MAX_BYTES) {
      throw new Error("Maximal 5 MB — bitte Foto komprimieren oder PDF verkleinern.");
    }
    const mime = detectSickAttachmentMime(buf);
    if (!mime) {
      throw new Error("Nur JPEG, PNG, WebP oder PDF sind erlaubt.");
    }
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    if (dataUrl.length > 7_500_000) {
      throw new Error("Anhang ist nach der Verarbeitung zu groß.");
    }
    return { mime, dataUrl };
  });
}
