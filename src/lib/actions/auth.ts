"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email/transactional";
import { generatePasswordResetToken, generateVerificationToken } from "@/lib/auth/tokens";
import { checkServerActionRateLimit } from "@/lib/server-action-rate-limit";

const MIN_PASSWORD_LENGTH = 8;

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) return;

  if (!checkServerActionRateLimit(`pwd-reset:${normalizedEmail}`, 3, 60 * 60 * 1000)) {
    return;
  }

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

  if (!checkServerActionRateLimit(`verify-resend:${normalizedEmail}`, 5, 60 * 60 * 1000)) {
    return;
  }

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
