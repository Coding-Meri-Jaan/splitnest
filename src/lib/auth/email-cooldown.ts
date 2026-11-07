/**
 * Supabase allows one auth email per address per `smtp_max_frequency` window
 * (60 seconds by default). This module keeps the app and the Supabase project
 * aligned, and turns Supabase's terse error into a countdown a person can act
 * on instead of a dead-end error.
 */
export const EMAIL_SEND_COOLDOWN_SECONDS = 60;

/**
 * Supabase reports: "For security purposes, you can only request this after 42
 * seconds." Older builds omit the number, so fall back to the configured
 * window. Unrelated rate-limit errors must return null.
 */
export function parseEmailCooldownSeconds(message: string): number | null {
  const match = /(?:after|in)\s+(\d+)\s+seconds?/i.exec(message);
  if (match) {
    const seconds = Number(match[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds;
    }
  }

  if (/for security purposes|only request this after/i.test(message)) {
    return EMAIL_SEND_COOLDOWN_SECONDS;
  }

  return null;
}

export function formatCooldown(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));

  if (total < 60) {
    return `${total} second${total === 1 ? "" : "s"}`;
  }

  const minutes = Math.floor(total / 60);
  const remainder = total % 60;

  if (remainder === 0) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  return `${minutes}m ${remainder}s`;
}

export function cooldownMessage(seconds: number): string {
  return `An email was sent to this address moments ago. You can request another in ${formatCooldown(
    seconds,
  )}. Check your inbox and spam folder first — delivery can take a minute.`;
}

/** Counts down from a "sent at" timestamp, never below zero. */
export function remainingCooldownSeconds(
  sentAtMs: number,
  nowMs: number = Date.now(),
): number {
  if (!Number.isFinite(sentAtMs) || sentAtMs <= 0) {
    return 0;
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((nowMs - sentAtMs) / 1000),
  );
  return Math.max(0, EMAIL_SEND_COOLDOWN_SECONDS - elapsedSeconds);
}
