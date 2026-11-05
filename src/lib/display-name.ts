const FALLBACK_NAME = "Member";

/**
 * True when a stored "name" is really just the local part of an email address.
 *
 * Older versions of the profile trigger copied `someone` out of
 * `someone@example.com` when no name was supplied, which made shared screens
 * such as "Paid by" look like they were leaking an email address.
 */
export function isEmailHandle(name: string, email: string): boolean {
  const handle = email.split("@")[0]?.trim().toLowerCase() ?? "";
  if (handle.length === 0) {
    return false;
  }
  return name.trim().toLowerCase() === handle;
}

interface NamedProfile {
  full_name?: string | null;
  email?: string | null;
}

/**
 * The name to show in shared UI. It never falls back to an email address:
 * showing an address (or its local part) as a person's name leaks it and is
 * not a name.
 */
export function displayName(
  profile: NamedProfile | null | undefined,
  fallback = FALLBACK_NAME,
): string {
  const name = profile?.full_name?.trim() ?? "";
  if (name.length === 0) {
    return fallback;
  }
  if (isEmailHandle(name, profile?.email ?? "")) {
    return fallback;
  }
  return name;
}
