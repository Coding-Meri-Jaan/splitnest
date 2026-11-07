import { headers } from "next/headers";

export { safePath } from "./safe-path";

/**
 * Absolute origin used in auth emails and confirmation redirects. Uses
 * NEXT_PUBLIC_SITE_URL when set (recommended in production) and falls back to
 * the request host.
 *
 * A request that actually arrived on localhost always wins over a configured
 * production URL, so `npm run dev` can confirm its own email links instead of
 * bouncing to the deployed site.
 */
export async function getSiteUrl(): Promise<string> {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");

  if (isLocal) {
    const protocol = headerList.get("x-forwarded-proto") ?? "http";
    return `${protocol}://${host}`;
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}
