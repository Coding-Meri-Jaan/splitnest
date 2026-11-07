import { cookies } from "next/headers";

import {
  EMAIL_SEND_COOLDOWN_SECONDS,
  remainingCooldownSeconds,
} from "./email-cooldown";
import { isSecureConnection } from "./session-server";

/**
 * Short-lived, httpOnly marker proving this browser just asked for an email to
 * a specific address. It lets the app answer "wait N seconds" itself instead of
 * making a doomed Supabase request, and it survives a page reload.
 *
 * The value is a truncated SHA-256 fingerprint plus the send time, so the email
 * address is never stored in the cookie.
 */
export const EMAIL_SENT_COOKIE = "sn-email-sent";

async function emailFingerprint(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export async function markEmailSent(email: string): Promise<void> {
  const cookieStore = await cookies();
  const secure = await isSecureConnection();
  const value = `${await emailFingerprint(email)}.${Date.now()}`;

  cookieStore.set(EMAIL_SENT_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: EMAIL_SEND_COOLDOWN_SECONDS,
  });
}

/** Remaining seconds for this address, or 0 when the window is clear. */
export async function readEmailCooldownSeconds(email: string): Promise<number> {
  const cookieStore = await cookies();
  const value = cookieStore.get(EMAIL_SENT_COOKIE)?.value;

  if (!value) {
    return 0;
  }

  const [fingerprint, sentAtValue] = value.split(".");
  if (!fingerprint || fingerprint !== (await emailFingerprint(email))) {
    return 0;
  }

  return remainingCooldownSeconds(Number(sentAtValue));
}

/** Clears the marker only when it belongs to the address being confirmed. */
export async function clearEmailSent(email: string | undefined): Promise<void> {
  if (!email) {
    return;
  }

  const cookieStore = await cookies();
  const value = cookieStore.get(EMAIL_SENT_COOKIE)?.value;
  if (!value) {
    return;
  }

  const [fingerprint] = value.split(".");
  if (fingerprint === (await emailFingerprint(email))) {
    cookieStore.delete(EMAIL_SENT_COOKIE);
  }
}
