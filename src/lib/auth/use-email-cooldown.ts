"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_PREFIX = "splitnest:email-cooldown:";
const CLOCK_SKEW_MS = 500;

function storageKey(email: string): string {
  return `${STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

function readStoredDeadline(email: string): number {
  if (typeof window === "undefined" || !email) {
    return 0;
  }

  try {
    const value = Number(window.localStorage.getItem(storageKey(email)));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function storeDeadline(email: string, deadline: number): void {
  if (typeof window === "undefined" || !email) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey(email), String(deadline));
  } catch {
    // Private mode or a full quota: the server cookie still protects us.
  }
}

/**
 * One shared store so every mounted form and every tab sees the same deadline.
 * Riding on `useSyncExternalStore` keeps the countdown out of effect-driven
 * state updates and makes the value consistent between the server render (no
 * wait yet) and the hydrated client.
 */
const listeners = new Set<() => void>();
let timer: number | null = null;
let cache = new Map<string, { checkedAt: number; seconds: number }>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function pruneExpiredDeadlines(): void {
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(STORAGE_PREFIX)) {
        continue;
      }

      const deadline = Number(window.localStorage.getItem(key));
      if (!Number.isFinite(deadline) || deadline <= Date.now()) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Storage can be unavailable; there is nothing to prune.
  }
}

function tick(): void {
  if (typeof window === "undefined") {
    return;
  }

  pruneExpiredDeadlines();
  cache = new Map();
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener);
    };
  }

  const onStorage = () => {
    cache = new Map();
    listener();
  };

  window.addEventListener("storage", onStorage);
  if (timer === null) {
    timer = window.setInterval(tick, 1000);
  }

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);

    if (listeners.size === 0 && timer !== null) {
      window.clearInterval(timer);
      timer = null;
      cache = new Map();
    }
  };
}

function secondsRemaining(email: string): number {
  if (typeof window === "undefined" || !email) {
    return 0;
  }

  const now = Date.now();
  const cached = cache.get(email);
  if (cached && now - cached.checkedAt < CLOCK_SKEW_MS) {
    return cached.seconds;
  }

  const deadline = readStoredDeadline(email);
  const seconds = deadline > now ? Math.ceil((deadline - now) / 1000) : 0;
  cache.set(email, { checkedAt: now, seconds });

  return seconds;
}

export interface EmailCooldown {
  remainingSeconds: number;
  active: boolean;
  /** Start or extend the countdown after the server confirms a send. */
  start: (seconds: number) => void;
}

/**
 * Keeps the resend button in sync with Supabase's per-address cooldown so a
 * person sees "Resend in 42 seconds" instead of submitting a request that is
 * guaranteed to fail. The server remains authoritative: if storage is cleared
 * or another tab sent the email, the action replies with the real remaining
 * seconds and `start` corrects the countdown.
 */
export function useEmailCooldown(
  email: string,
  initialSeconds = 0,
): EmailCooldown {
  const remainingSeconds = useSyncExternalStore(
    subscribe,
    () => secondsRemaining(email),
    () => 0,
  );

  const start = useCallback(
    (seconds: number) => {
      const safe = Math.max(0, Math.ceil(seconds));
      if (!email || safe <= 0) {
        return;
      }

      const target = Date.now() + safe * 1000;
      const deadline = Math.max(readStoredDeadline(email), target);
      storeDeadline(email, deadline);
      cache.delete(email);
      emit();
    },
    [email],
  );

  // A server-rendered cooldown (for example after a reload of /verify-email)
  // seeds the same store the controls read from.
  useEffect(() => {
    if (initialSeconds > 0) {
      start(initialSeconds);
    }
  }, [initialSeconds, start]);

  return {
    remainingSeconds,
    active: remainingSeconds > 0,
    start,
  };
}
