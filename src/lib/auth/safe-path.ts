/**
 * Only allow same-origin relative paths, never protocol-relative or absolute
 * URLs. This runs on both the server and the client, so it deliberately has no
 * dependency on request headers.
 *
 * `new URL` is used instead of string checks because browsers treat a backslash
 * as a slash in special URLs: `/\evil.example` otherwise resolves to a
 * different origin. Comparing origins closes that bypass.
 */
const FALLBACK = "/dashboard";
const PROBE_ORIGIN = "http://splitnest.local";

export function safePath(value: unknown): string {
  if (typeof value !== "string") {
    return FALLBACK;
  }

  // Reject absolute and protocol-relative URLs before parsing.
  if (!value.startsWith("/") || value.startsWith("//")) {
    return FALLBACK;
  }

  try {
    const url = new URL(value, PROBE_ORIGIN);

    if (url.origin !== PROBE_ORIGIN || !url.pathname.startsWith("/")) {
      return FALLBACK;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return FALLBACK;
  }
}
