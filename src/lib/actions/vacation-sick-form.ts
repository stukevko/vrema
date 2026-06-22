"use server";

import { requestSickLeave } from "@/lib/actions/vacation";
import { parseSickAttachmentFile } from "@/lib/sick-attachment";

export async function submitSickLeaveForm(formData: FormData) {
  const startRaw = String(formData.get("startDate") ?? "");
  const endRaw = String(formData.get("endDate") ?? "");
  const note = String(formData.get("sickNote") ?? "").trim() || undefined;

  if (!startRaw || !endRaw) {
    throw new Error("Bitte Start- und Enddatum angeben.");
  }

  const startDate = new Date(startRaw);
  const endDate = new Date(endRaw);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Ungültiges Datum.");
  }
  if (endDate < startDate) {
    throw new Error("Enddatum muss nach dem Startdatum liegen.");
  }

  let attachment: { mime: string; dataUrl: string } | undefined;
  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    attachment = await parseSickAttachmentFile(file);
  }

  return requestSickLeave({ startDate, endDate, note, attachment });
}
