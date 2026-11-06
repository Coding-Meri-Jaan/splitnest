/**
 * Password policy shared by signup and password reset.
 *
 * The limits are deliberately stricter than Supabase's defaults so a leaked
 * database is less useful to an attacker. Supabase hashes with bcrypt, which
 * only considers the first 72 bytes of a password, so anything longer is
 * rejected instead of silently truncated.
 */
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 72;

export const PASSWORD_REQUIREMENTS = [
  `At least ${MIN_PASSWORD_LENGTH} characters`,
  "One uppercase letter",
  "One lowercase letter",
  "One number",
  "One symbol such as ! ? @ # $",
] as const;

export interface PasswordContext {
  email?: string;
  name?: string;
}

export type PasswordValidation =
  | { valid: true }
  | { valid: false; message: string };

/**
 * A short list of passwords that are always guessed first. It is not meant to
 * be exhaustive - Supabase's leaked-password protection should also be turned
 * on in the dashboard - but it stops the most obvious choices before a request
 * ever reaches the auth server.
 */
const COMMON_PASSWORDS = new Set([
  "1234567890",
  "123456789",
  "12345678",
  "1234567",
  "123456",
  "password",
  "password1",
  "password123",
  "password1234",
  "password123!",
  "passw0rd",
  "p@ssw0rd",
  "qwerty123",
  "qwerty123!",
  "qwertyuiop",
  "qwerty1234",
  "abc123456",
  "abcd1234",
  "iloveyou",
  "letmein123",
  "welcome123",
  "welcome1",
  "admin123",
  "administrator",
  "monkey123",
  "dragon123",
  "football",
  "baseball",
  "sunshine",
  "princess",
  "trustno1",
  "splitnest",
  "splitnest123",
  "splitnest123!",
  "changeme",
  "changeme123",
  "secret123",
  "master123",
  "superman",
  "batman123",
  "starwars",
  "whatever",
  "zaq12wsx",
]);

function lower(value: string): string {
  return value.toLowerCase();
}

/**
 * Passwords must not contain the person's own email handle or name. That
 * turns a public profile into a shortcut for guessing the account password.
 */
function containsPersonalInformation(
  password: string,
  context: PasswordContext,
): boolean {
  const haystack = lower(password);

  const emailHandle = context.email?.split("@")[0]?.trim() ?? "";
  if (emailHandle.length >= 3 && haystack.includes(lower(emailHandle))) {
    return true;
  }

  const nameTokens = (context.name ?? "")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

  return nameTokens.some((token) => haystack.includes(lower(token)));
}

export function validatePassword(
  password: string,
  context: PasswordContext = {},
): PasswordValidation {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`,
    };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password needs a lowercase letter." };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password needs an uppercase letter." };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password needs a number." };
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return {
      valid: false,
      message: "Password needs a symbol such as ! ? @ # $.",
    };
  }

  if (COMMON_PASSWORDS.has(lower(password))) {
    return {
      valid: false,
      message: "That password is too common. Choose something less predictable.",
    };
  }

  if (containsPersonalInformation(password, context)) {
    return {
      valid: false,
      message: "Password should not contain your name or email address.",
    };
  }

  return { valid: true };
}
