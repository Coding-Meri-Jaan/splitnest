/**
 * Email address checks that run before Supabase is called.
 *
 * This cannot prove an address is real - only an actual delivery can - but it
 * rejects malformed addresses, placeholder domains and the throwaway inboxes
 * that fake signups tend to use. The email-confirmation flow is the real gate;
 * see README "Configure Supabase Auth".
 */
export interface EmailValidation {
  valid: boolean;
  reason: string | null;
}

const BASIC_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_LABEL_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const TLD_PATTERN = /^[A-Za-z]{2,63}$/;

const BLOCKED_TLDS = new Set([
  "arpa",
  "example",
  "home",
  "internal",
  "invalid",
  "lan",
  "local",
  "localhost",
  "test",
]);

/**
 * Placeholder/local-only domains and common disposable mail providers. A
 * subdomain of a blocked domain is blocked too (for example
 * `inbox.mailinator.com`).
 */
const BLOCKED_DOMAINS = new Set([
  "10minutemail.com",
  "discard.email",
  "dispostable.com",
  "einrot.com",
  "emailfake.com",
  "emailondeck.com",
  "example.com",
  "example.net",
  "example.org",
  "fake.com",
  "fakeemail.com",
  "fakeinbox.com",
  "frapmail.com",
  "generator.email",
  "getnada.com",
  "grr.la",
  "guerrillamail.com",
  "harakirimail.com",
  "instantemailaddress.com",
  "jourrapide.com",
  "linshiyouxiang.net",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "mailpoof.com",
  "mail-temp.com",
  "mintemail.com",
  "mohmal.com",
  "moakt.com",
  "mytemp.email",
  "sharklasers.com",
  "spam4.me",
  "spambog.com",
  "tempail.com",
  "tempemail.net",
  "temp-mail.org",
  "tempinbox.com",
  "tempmail.com",
  "test.com",
  "test.net",
  "test.org",
  "throwawaymail.com",
  "tmpmail.org",
  "trashmail.com",
  "wegwerfemail.de",
  "yopmail.com",
]);

const BLOCKED_LOCAL_PARTS = new Set([
  "abc",
  "abcd",
  "admin",
  "asdf",
  "asdfasdf",
  "baz",
  "dummy",
  "example",
  "fake",
  "faker",
  "foo",
  "na",
  "no-reply",
  "none",
  "noreply",
  "null",
  "qwerty",
  "test",
  "testing",
  "x",
  "xx",
  "xxx",
]);

function blockedByDomainList(domain: string): boolean {
  for (const blocked of BLOCKED_DOMAINS) {
    if (domain === blocked || domain.endsWith(`.${blocked}`)) {
      return true;
    }
  }
  return false;
}

/** Trims and lowercases an address so comparisons are stable. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Basic shape check for sign-in and password-reset. Those flows must keep
 * working for accounts created before a domain was added to the signup
 * blocklist, so they only reject clearly malformed input.
 */
export function hasEmailShape(raw: string): boolean {
  const email = normalizeEmail(raw);
  return email.length > 0 && email.length <= 254 && BASIC_PATTERN.test(email);
}

export function validateEmail(raw: string): EmailValidation {
  const email = normalizeEmail(raw);

  if (email.length === 0) {
    return { valid: false, reason: "Enter your email address." };
  }

  if (email.length > 254) {
    return { valid: false, reason: "That email address is too long." };
  }

  if (!BASIC_PATTERN.test(email)) {
    return {
      valid: false,
      reason: "Enter a valid email address, like you@example.com.",
    };
  }

  const atIndex = email.lastIndexOf("@");
  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  if (localPart.length === 0 || localPart.length > 64) {
    return { valid: false, reason: "Enter a valid email address." };
  }

  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !LOCAL_PATTERN.test(localPart)
  ) {
    return { valid: false, reason: "Enter a valid email address." };
  }

  if (BLOCKED_LOCAL_PARTS.has(localPart)) {
    return {
      valid: false,
      reason: "Use a real email address you can open - not a placeholder.",
    };
  }

  if (domain.startsWith("[") || domain.includes("..") || domain.length > 253) {
    return { valid: false, reason: "Enter a valid email address." };
  }

  const labels = domain.split(".");
  if (labels.length < 2) {
    return {
      valid: false,
      reason: "Enter a complete email address with a domain.",
    };
  }

  if (!labels.every((label) => DOMAIN_LABEL_PATTERN.test(label))) {
    return { valid: false, reason: "Enter a valid email domain." };
  }

  const tld = labels[labels.length - 1] ?? "";
  if (!TLD_PATTERN.test(tld) || BLOCKED_TLDS.has(tld)) {
    return {
      valid: false,
      reason: "That email domain cannot receive mail. Use a real address.",
    };
  }

  if (blockedByDomainList(domain)) {
    return {
      valid: false,
      reason:
        "Disposable and placeholder email addresses are not allowed. Use an address you can open.",
    };
  }

  return { valid: true, reason: null };
}

/** The domain portion of a normalized address, or null if malformed. */
export function emailDomain(raw: string): string | null {
  const email = normalizeEmail(raw);
  const atIndex = email.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === email.length - 1) {
    return null;
  }
  return email.slice(atIndex + 1);
}
