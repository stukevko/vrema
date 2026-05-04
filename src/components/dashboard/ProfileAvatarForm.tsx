"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2, UserRound } from "lucide-react";
import { removeUserProfileAvatar, updateUserProfileAvatar } from "@/lib/actions/profile";

const MAX_EDGE = 512;
const JPEG_QUALITY = 0.88;

async function resizeToJpegBlob(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar.");
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Konnte Bild nicht kodieren."))), "image/jpeg", JPEG_QUALITY);
  });
}

export function ProfileAvatarForm({ imageUrl }: { imageUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const previewSrc = imageUrl;

  const onPick = () => inputRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const blob = await resizeToJpegBlob(file);
        const fd = new FormData();
        fd.append("avatar", blob, "profil.jpg");
        await updateUserProfileAvatar(fd);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
      }
    });
  };

  const onRemove = () => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await removeUserProfileAvatar();
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Konnte Profilbild nicht entfernen.");
      }
    });
  };

  const hasPhoto = Boolean(previewSrc);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          {hasPhoto && previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- data-URLs & /api/user-avatar
            <img
              src={previewSrc}
              alt=""
              width={96}
              height={96}
              className="h-24 w-24 rounded-2xl border border-border object-cover shadow-[0_12px_30px_rgba(0,0,0,0.06)]"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 text-muted-foreground">
              <UserRound className="h-10 w-10" aria-hidden />
            </div>
          )}
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:pt-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={onFile}
            disabled={isPending}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPick}
              disabled={isPending}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20 transition-colors hover:bg-primary/90 disabled:opacity-60 sm:flex-none"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {hasPhoto ? "Neues Bild wählen" : "Bild hochladen"}
            </button>
            {hasPhoto && (
              <button
                type="button"
                onClick={onRemove}
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Entfernen
              </button>
            )}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            JPEG, PNG oder Webp — wird automatisch auf max. {MAX_EDGE}px verkleinert. Max. ca. 280 KB nach der
            Kompression.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>
      )}
      {success && <p className="text-xs font-medium text-emerald-700">Profil aktualisiert.</p>}
    </div>
  );
}
