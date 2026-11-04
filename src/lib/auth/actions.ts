"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { AuthActionState } from "./types";
import { describeAuthError } from "./errors";
import { getSiteUrl, safePath } from "./site-url";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const NOT_CONFIGURED =
  "Sign-in is not set up yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the server.";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: NOT_CONFIGURED, message: null };
  }

  const email = readField(formData, "email").toLowerCase();
  const password = readField(formData, "password");

  if (!EMAIL_PATTERN.test(email) || password === "") {
    return { error: "Enter a valid email and your password.", message: null };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error: describeAuthError(error, "Incorrect email or password."),
      message: null,
    };
  }

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
  const email = readField(formData, "email").toLowerCase();
  const password = readField(formData, "password");
  const confirmPassword = readField(formData, "confirmPassword");

  if (fullName.length < 2) {
    return { error: "Enter your name.", message: null };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address.", message: null };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      message: null,
    };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", message: null };
  }

  const siteUrl = await getSiteUrl();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/dashboard`,
    },
  });

  if (error) {
    const alreadyRegistered = /already registered|already exists/i.test(error.message);
    return {
      error: alreadyRegistered
        ? "An account with this email already exists. Try signing in."
        : describeAuthError(error, "Could not create your account. Please try again."),
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
  if (data.session) {
    redirect("/dashboard");
  }

  return {
    error: null,
    message: `We sent a confirmation link to ${email}. Open it to finish signing up.`,
  };
}

export async function requestPasswordResetAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: NOT_CONFIGURED, message: null };
  }

  const email = readField(formData, "email").toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
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

  const password = readField(formData, "password");
  const confirmPassword = readField(formData, "confirmPassword");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      message: null,
    };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", message: null };
  }

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

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error: describeAuthError(error, "Could not update your password. Please try again."),
      message: null,
    };
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
