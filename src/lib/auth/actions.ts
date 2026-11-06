"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

import { domainAcceptsEmail } from "./email-domain";
import {
  emailDomain,
  hasEmailShape,
  normalizeEmail,
  validateEmail,
} from "./email";
import { describeAuthError } from "./errors";
import { validatePassword } from "./password";
import { getSiteUrl, safePath } from "./site-url";
import { markSessionActive, clearSessionCookies } from "./session-server";
import type { AuthActionState } from "./types";

const NOT_CONFIGURED =
  "Sign-in is not set up yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the server.";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Passwords must never be trimmed: leading/trailing characters are part of the
 * secret, and trimming them on login would make an otherwise-correct password
 * fail (or, worse, make two different passwords equivalent).
 */
function readSecret(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readRemember(formData: FormData): boolean {
  const value = formData.get("remember");
  return value === "1" || value === "on" || value === "true";
}

export async function loginAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: NOT_CONFIGURED, message: null };
  }

  const email = normalizeEmail(readField(formData, "email"));
  const password = readSecret(formData, "password");
  const remember = readRemember(formData);

  if (!hasEmailShape(email)) {
    return { error: "Enter a valid email address.", message: null };
  }

  if (password === "") {
    return { error: "Enter your password.", message: null };
  }

  const supabase = await createSupabaseServerClient({ remember });
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const unconfirmed =
      error.code === "email_not_confirmed" ||
      error.message.toLowerCase().includes("email not confirmed");

    return {
      error: describeAuthError(error, "Incorrect email or password."),
      message: null,
      errorCode: unconfirmed ? "email_not_confirmed" : null,
    };
  }

  await markSessionActive(remember);
  redirect(safePath(formData.get("next")));
}

export async function signupAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: NOT_CONFIGURED, message: null };
  }

  const fullName = readField(formData, "fullName");
  const email = normalizeEmail(readField(formData, "email"));
  const password = readSecret(formData, "password");
  const confirmPassword = readSecret(formData, "confirmPassword");

  if (fullName.length < 2) {
    return { error: "Enter your name.", message: null };
  }

  if (fullName.length > 80) {
    return { error: "Keep your name under 80 characters.", message: null };
  }

  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) {
    return { error: emailCheck.reason, message: null };
  }

  const domain = emailDomain(email);
  if (domain && !(await domainAcceptsEmail(domain))) {
    return {
      error:
        "That email domain cannot receive mail. Use an address you can open.",
      message: null,
    };
  }

  const passwordCheck = validatePassword(password, { email, name: fullName });
  if (!passwordCheck.valid) {
    return { error: passwordCheck.message, message: null };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", message: null };
  }

  const siteUrl = await getSiteUrl();
  const supabase = await createSupabaseServerClient({ remember: true });
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/dashboard`,
    },
  });

  if (error) {
    const alreadyRegistered = /already registered|already exists/i.test(
      error.message,
    );
    return {
      error: alreadyRegistered
        ? "An account with this email already exists. Try signing in."
        : describeAuthError(
            error,
            "Could not create your account. Please try again.",
          ),
      message: null,
    };
  }

  // With email-enumeration protection on, Supabase answers with a user that has
  // no identities instead of an error when the address is already registered.
  if (data.user && data.user.identities?.length === 0) {
    return {
      error: "An account with this email already exists. Try signing in.",
      message: null,
    };
  }

  // Email confirmation disabled in Supabase: a session is returned immediately.
  // Enabling confirm email (and SMTP) is the only way to make this a real check;
  // see README "Configure Supabase Auth" and /api/health.
  if (data.session) {
    await markSessionActive(true);
    redirect("/dashboard");
  }

  return {
    error: null,
    message: `We sent a confirmation link to ${email}. Open it to finish signing up.`,
  };
}

export async function signInWithGoogleAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: NOT_CONFIGURED, message: null };
  }

  const next = safePath(formData.get("next"));
  const remember = readRemember(formData);
  const siteUrl = await getSiteUrl();

  const callback = new URL("/auth/confirm", siteUrl);
  callback.searchParams.set("next", next);
  callback.searchParams.set("remember", remember ? "1" : "0");

  const supabase = await createSupabaseServerClient({ remember });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      skipBrowserRedirect: true,
      // Always show Google's account chooser; the person may be signed into a
      // different Google account than the SplitNest account they want.
      queryParams: { prompt: "select_account" },
    },
  });

  if (error) {
    return {
      error: describeAuthError(
        error,
        "Could not start Google sign-in. Please try again.",
      ),
      message: null,
    };
  }

  if (!data.url) {
    return {
      error: "Google sign-in did not return a redirect URL. Try again.",
      message: null,
    };
  }

  redirect(data.url);
}

export async function requestPasswordResetAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: NOT_CONFIGURED, message: null };
  }

  const email = normalizeEmail(readField(formData, "email"));

  if (!hasEmailShape(email)) {
    return { error: "Enter a valid email address.", message: null };
  }

  const siteUrl = await getSiteUrl();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    // Logged for the operator; the visitor still gets a neutral answer.
    console.error("[auth] resetPasswordForEmail failed", {
      status: error.status,
      code: error.code,
      message: error.message,
    });
  }

  // Always the same answer: never reveal whether an email is registered.
  return {
    error: null,
    message: "If that email has an account, a reset link is on its way.",
  };
}

export async function updatePasswordAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: NOT_CONFIGURED, message: null };
  }

  const password = readSecret(formData, "password");
  const confirmPassword = readSecret(formData, "confirmPassword");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "This reset link has expired. Request a new one.",
      message: null,
    };
  }

  const passwordCheck = validatePassword(password, {
    email: user.email,
    name:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : undefined,
  });

  if (!passwordCheck.valid) {
    return { error: passwordCheck.message, message: null };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", message: null };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error: describeAuthError(
        error,
        "Could not update your password. Please try again.",
      ),
      message: null,
    };
  }

  redirect("/dashboard");
}

export async function resendVerificationAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: NOT_CONFIGURED, message: null };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Without a session we still allow a resend from the login screen, where the
  // person just typed the address. With a session, always trust the session's
  // address instead of a form field.
  const requestedEmail = normalizeEmail(readField(formData, "email"));
  const email = user?.email ?? requestedEmail;

  if (!hasEmailShape(email)) {
    return {
      error: "Enter the email address you signed up with.",
      message: null,
    };
  }

  if (user?.email && user.email_confirmed_at) {
    return {
      error: null,
      message: "That email is already confirmed. You can log in.",
    };
  }

  const siteUrl = await getSiteUrl();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/dashboard`,
    },
  });

  if (error) {
    return {
      error: describeAuthError(
        error,
        "Could not resend the confirmation email. Try again shortly.",
      ),
      message: null,
    };
  }

  return {
    error: null,
    message: `Confirmation email sent to ${email}. Check your inbox.`,
  };
}

export async function logoutAction(): Promise<void> {
  await performSignOut("local");
  redirect("/");
}

/** Invalidates refresh tokens on every device, then clears this browser. */
export async function signOutEverywhereAction(): Promise<void> {
  await performSignOut("global");
  redirect("/login?message=signed-out-everywhere");
}

/** Sign out the current browser so a different account can sign in. */
export async function switchAccountAction(formData: FormData): Promise<void> {
  await performSignOut("local");
  const next = safePath(formData.get("next"));
  redirect(
    `/login?message=switched-account&next=${encodeURIComponent(next)}`,
  );
}

async function performSignOut(scope: "local" | "global"): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.signOut({ scope });
      if (error) {
        console.error("[auth] signOut failed", {
          scope,
          status: error.status,
          code: error.code,
          message: error.message,
        });
      }
    } catch (error) {
      // A network failure must not keep the browser signed in.
      console.error("[auth] signOut threw", error);
    }
  }

  // signOut normally clears the auth cookies. Remove any that survived a
  // failed call, plus the idle/remember markers, so the next request cannot
  // refresh the old session.
  await clearSessionCookies();
}
