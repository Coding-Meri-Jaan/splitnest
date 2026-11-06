import { Resolver } from "node:dns/promises";

/**
 * Best-effort check that a domain can receive mail. It looks for MX records
 * first and falls back to A/AAAA records because a few small domains accept
 * mail on the domain itself.
 *
 * The check fails open: a DNS outage or a blocked resolver must not stop a
 * real person from signing up. It still rejects NXDOMAIN and domains that
 * explicitly have no mail records, which is what catches addresses invented
 * for a fake signup.
 *
 * Set AUTH_EMAIL_DNS_CHECK=off to skip this in environments without DNS.
 */
export async function domainAcceptsEmail(domain: string): Promise<boolean> {
  if (process.env.AUTH_EMAIL_DNS_CHECK === "off") {
    return true;
  }

  const resolver = new Resolver({ timeout: 2500, tries: 2 });

  try {
    const records = await resolver.resolveMx(domain);
    if (records.length > 0) {
      return true;
    }
  } catch (error) {
    if (isMissingRecord(error)) {
      // No MX records. Some domains still accept mail on their A/AAAA
      // records, so fall through instead of rejecting immediately.
    } else {
      // Timeout or resolver failure: do not punish the person signing up.
      return true;
    }
  }

  const [ipv4, ipv6] = await Promise.allSettled([
    resolver.resolve4(domain),
    resolver.resolve6(domain),
  ]);

  if (
    (ipv4.status === "fulfilled" && ipv4.value.length > 0) ||
    (ipv6.status === "fulfilled" && ipv6.value.length > 0)
  ) {
    return true;
  }

  if (
    ipv4.status === "rejected" &&
    ipv6.status === "rejected" &&
    isMissingRecord(ipv4.reason) &&
    isMissingRecord(ipv6.reason)
  ) {
    return false;
  }

  return true;
}

function isMissingRecord(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const code = String((error as { code?: unknown }).code);
  return code === "ENOTFOUND" || code === "ENODATA" || code === "NXDOMAIN";
}
