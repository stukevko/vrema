import { describe, expect, it } from "vitest";
import {
  detectSickAttachmentMime,
  sickAttachmentRetainUntil,
  SICK_ATTACHMENT_RETENTION_YEARS,
} from "@/lib/sick-attachment";

describe("detectSickAttachmentMime", () => {
  it("erkennt PDF an der Magic-Bytes-Signatur", () => {
    const buf = Buffer.from("%PDF-1.4 fake");
    expect(detectSickAttachmentMime(buf)).toBe("application/pdf");
  });

  it("erkennt JPEG", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectSickAttachmentMime(buf)).toBe("image/jpeg");
  });

  it("lehnt unbekannte Formate ab", () => {
    expect(detectSickAttachmentMime(Buffer.from("hello"))).toBeNull();
  });
});

describe("sickAttachmentRetainUntil", () => {
  it("setzt Aufbewahrung auf 3 Jahre", () => {
    const from = new Date("2026-06-01T12:00:00Z");
    const until = sickAttachmentRetainUntil(from);
    expect(until.getFullYear()).toBe(from.getFullYear() + SICK_ATTACHMENT_RETENTION_YEARS);
  });
});
