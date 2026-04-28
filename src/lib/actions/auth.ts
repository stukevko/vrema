"use server";

import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/actions/emails";

const VERIFICATION_TOKEN_TTL_HOURS = 24;
const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;
const MIN_PASSWORD_LENGTH = 8;

export async function generateVerificationToken(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const identifier = `verify:${normalizedEmail}`;
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await db.verificationToken.deleteMany({
    where: { identifier },
  });

  await db.verificationToken.create({
    data: {
      identifier,
      token,
      expires,
    },
  });

  return { token, expires };
}

export async function generatePasswordResetToken(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const identifier = `reset:${normalizedEmail}`;
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await db.verificationToken.deleteMany({
    where: { identifier },
  });

  await db.verificationToken.create({
    data: {
      identifier,
      token,
      expires,
    },
  });

  return { token, expires };
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) return;

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { email: true, name: true },
  });

  // Security: do not leak whether user exists.
  if (!user) return;

  const { token } = await generatePasswordResetToken(normalizedEmail);
  await sendPasswordResetEmail(normalizedEmail, token, user.name ?? "Vrema Nutzer");
}

export async function resetPassword(token: string, newPassword: string) {
  if (!token) {
    throw new Error("Ungültiger Reset-Token.");
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`);
  }

  const resetToken = await db.verificationToken.findUnique({
    where: { token },
  });

  if (!resetToken || !resetToken.identifier.startsWith("reset:")) {
    throw new Error("Reset-Link ist ungültig.");
  }

  if (resetToken.expires < new Date()) {
    await db.verificationToken.delete({ where: { token } });
    throw new Error("Reset-Link ist abgelaufen.");
  }

  const email = resetToken.identifier.replace("reset:", "");
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await db.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  await db.verificationToken.delete({ where: { token } });
}

export async function resendVerificationLink(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) return;

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { email: true, name: true, emailVerified: true },
  });

  if (!user || user.emailVerified) {
    return;
  }

  const { token } = await generateVerificationToken(normalizedEmail);
  const baseUrl = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://vrema.app";
  const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;

  await sendVerificationEmail({
    recipientName: user.name ?? "Vrema Nutzer",
    recipientEmail: normalizedEmail,
    verifyUrl,
  });
}
