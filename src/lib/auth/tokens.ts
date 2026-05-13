/**
 * Interne Helper für Verifikations- und Reset-Tokens.
 *
 * Bewusst **kein** `"use server"`-Modul: würde sonst über die Server-Action-RPC
 * vom Browser aufrufbar – Angreifer könnten Tokens für beliebige E-Mails
 * generieren und damit Brute-Force-/Spam-Vektoren öffnen.
 */

import { randomBytes } from "crypto";
import { db } from "@/lib/db";

const VERIFICATION_TOKEN_TTL_HOURS = 24;
const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;

export async function generateVerificationToken(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const identifier = `verify:${normalizedEmail}`;
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({ data: { identifier, token, expires } });

  return { token, expires };
}

export async function generatePasswordResetToken(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const identifier = `reset:${normalizedEmail}`;
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({ data: { identifier, token, expires } });

  return { token, expires };
}
