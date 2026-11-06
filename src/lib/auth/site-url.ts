import { headers } from "next/headers";

export { safePath } from "./safe-path";

/**
 * Absolute origin used in auth emails. Uses NEXT_PUBLIC_SITE_URL when set
 * (recommended in production) and falls back to the request host.
 */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol = headerList.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");

  return `${protocol}://${host}`;
}
