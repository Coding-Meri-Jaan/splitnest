#!/usr/bin/env node
/**
 * Configures Supabase Auth from this machine.
 *
 * The app refuses email/password signups while Supabase auto-confirms
 * addresses, so the default mode also turns on Confirm email and installs
 * custom SMTP — the only real fix for made-up addresses.
 *
 *   npm run auth:configure -- --dry-run
 *   npm run auth:configure
 *
 * If you only want Google sign-in for now, run the Google-only mode. It leaves
 * email/password signup blocked (the app gate stays closed) and just turns on
 * the provider:
 *
 *   npm run auth:configure -- --google-only --dry-run
 *   npm run auth:configure -- --google-only
 *
 * Required values live in .env.local (gitignored):
 *   SUPABASE_ACCESS_TOKEN   https://supabase.com/dashboard/account/tokens
 *   AUTH_SITE_URL           https://splitnest-payments.netlify.app
 *   GOOGLE_CLIENT_ID        Google Cloud → Credentials → OAuth client
 *   GOOGLE_CLIENT_SECRET
 *
 * Required for the default (email) mode, in addition to the above:
 *   AUTH_SMTP_HOST          e.g. smtp.sendgrid.net / smtp.brevo.com
 *   AUTH_SMTP_USER          SMTP username (SendGrid uses "apikey")
 *   AUTH_SMTP_PASS          SMTP password / API key
 *   AUTH_SMTP_FROM          verified sender address
 *
 * Optional:
 *   SUPABASE_PROJECT_REF    derived from NEXT_PUBLIC_SUPABASE_URL when absent
 *   AUTH_SMTP_PORT          default 587
 *   AUTH_SMTP_SENDER_NAME   default "SplitNest"
 *   AUTH_EMAIL_RATE_LIMIT   auth emails per hour, default 30. Supabase keeps
 *                           the built-in 2/hour cap even after custom SMTP is
 *                           connected until this setting is raised.
 *   AUTH_EMAIL_COOLDOWN_SECONDS
 *                           per-address wait between auth emails, default 60.
 *                           The app mirrors this window in its resend UI.
 *   AUTH_REDIRECT_URLS      comma-separated; defaults to <site>/auth/confirm
 *                           plus http://localhost:3000/auth/confirm
 */

const dryRun = process.argv.includes("--dry-run");
const googleOnly = process.argv.includes("--google-only");

function value(name) {
  const raw = process.env[name];
  return typeof raw === "string" ? raw.trim() : "";
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function projectRef() {
  const explicit = value("SUPABASE_PROJECT_REF");
  if (explicit) return explicit;

  const url = value("NEXT_PUBLIC_SUPABASE_URL");
  const apiMatch = /^https?:\/\/([a-z0-9]+)\.supabase\.co/i.exec(url);
  if (apiMatch) return apiMatch[1];

  const dashboardMatch = /\/dashboard\/project\/([a-z0-9]+)/i.exec(url);
  if (dashboardMatch) return dashboardMatch[1];

  fail(
    "Set SUPABASE_PROJECT_REF, or NEXT_PUBLIC_SUPABASE_URL, in .env.local.",
  );
}

const token = value("SUPABASE_ACCESS_TOKEN");
const ref = projectRef();
const smtpHost = value("AUTH_SMTP_HOST");
const smtpUser = value("AUTH_SMTP_USER");
const smtpPass = value("AUTH_SMTP_PASS");
const smtpFrom = value("AUTH_SMTP_FROM");
const siteUrl = value("AUTH_SITE_URL").replace(/\/+$/, "");
const smtpPort = value("AUTH_SMTP_PORT") || "587";
const senderName = value("AUTH_SMTP_SENDER_NAME") || "SplitNest";
const emailRateLimit = Number(value("AUTH_EMAIL_RATE_LIMIT") || "30");
const emailCooldownSeconds = Number(
  value("AUTH_EMAIL_COOLDOWN_SECONDS") || "60",
);
const googleClientId = value("GOOGLE_CLIENT_ID");
const googleClientSecret = value("GOOGLE_CLIENT_SECRET");

const googleConfigured = Boolean(googleClientId && googleClientSecret);

if (!dryRun && !token) {
  fail(
    "SUPABASE_ACCESS_TOKEN is missing. Create one at https://supabase.com/dashboard/account/tokens.",
  );
}
if (!siteUrl) {
  fail("AUTH_SITE_URL is missing (for example https://splitnest-payments.netlify.app).");
}
if (googleOnly && !googleConfigured) {
  fail("Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for --google-only.");
}
if (Boolean(googleClientId) !== Boolean(googleClientSecret)) {
  fail("Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither.");
}
if (!googleOnly && (!smtpHost || !smtpUser || !smtpPass || !smtpFrom)) {
  fail(
    "AUTH_SMTP_HOST, AUTH_SMTP_USER, AUTH_SMTP_PASS, and AUTH_SMTP_FROM are required. Connect an SMTP provider first (SendGrid, Brevo, Resend, Postmark, SES), or use --google-only.",
  );
}
if (!googleOnly && (!Number.isInteger(emailRateLimit) || emailRateLimit < 1)) {
  fail("AUTH_EMAIL_RATE_LIMIT must be a whole number of emails per hour, for example 30.");
}
if (
  !googleOnly &&
  (!Number.isInteger(emailCooldownSeconds) || emailCooldownSeconds < 1)
) {
  fail(
    "AUTH_EMAIL_COOLDOWN_SECONDS must be a whole number of seconds, for example 60.",
  );
}

const redirects =
  value("AUTH_REDIRECT_URLS") ||
  [`${siteUrl}/auth/confirm`, "http://localhost:3000/auth/confirm"].join(",");

const payload = {
  site_url: siteUrl,
  uri_allow_list: redirects,
};

if (googleConfigured) {
  payload.external_google_enabled = true;
  payload.external_google_client_id = googleClientId;
  payload.external_google_secret = googleClientSecret;
}

if (!googleOnly) {
  // The two settings that make fake emails impossible through this app.
  payload.mailer_autoconfirm = false;
  payload.mailer_allow_unverified_email_sign_ins = false;
  payload.external_email_enabled = true;
  payload.mailer_secure_email_change_enabled = true;

  payload.smtp_host = smtpHost;
  payload.smtp_port = smtpPort;
  payload.smtp_user = smtpUser;
  payload.smtp_pass = smtpPass;
  payload.smtp_admin_email = smtpFrom;
  payload.smtp_sender_name = senderName;

  // Custom SMTP lifts the built-in sender, but Supabase does not raise the
  // email quota on its own. Leaving it at 2/hour makes real signups fail as
  // soon as a couple of confirmation emails have been sent.
  payload.rate_limit_email_sent = emailRateLimit;
  // One message per address per window. The app shows this as a live
  // countdown instead of letting people hit a permanent-looking error.
  payload.smtp_max_frequency = emailCooldownSeconds;
}

console.log(`\nProject: ${ref}`);
console.log(`Site URL: ${siteUrl}`);
console.log(`Mode: ${googleOnly ? "Google only" : "Google + verified email"}`);
if (!googleOnly) {
  console.log(`SMTP: ${smtpHost}:${smtpPort} as ${smtpUser}`);
  console.log(`Sender: ${senderName} <${smtpFrom}>`);
  console.log(`Email rate limit: ${emailRateLimit}/hour`);
  console.log(
    `Per-address email cooldown: ${emailCooldownSeconds} second${
      emailCooldownSeconds === 1 ? "" : "s"
    }`,
  );
}
if (googleConfigured) {
  console.log(`Google client: ${googleClientId}`);
}
console.log(`Redirects: ${redirects}`);

if (dryRun) {
  console.log("\nDry run payload (secrets masked):");
  console.log(
    JSON.stringify(
      {
        ...payload,
        smtp_pass: payload.smtp_pass ? "***" : undefined,
        external_google_secret: payload.external_google_secret
          ? "***"
          : undefined,
      },
      null,
      2,
    ),
  );
  console.log("\nNothing was changed. Re-run without --dry-run.\n");
  process.exit(0);
}

const endpoint = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

const patchResponse = await fetch(endpoint, {
  method: "PATCH",
  headers,
  body: JSON.stringify(payload),
});

if (!patchResponse.ok) {
  const body = await patchResponse.text();
  fail(`Supabase returned HTTP ${patchResponse.status}: ${body}`);
}

const getResponse = await fetch(endpoint, { headers });

if (!getResponse.ok) {
  console.log(
    "\n✔ Update sent, but the verification read failed. Check /api/health.",
  );
  process.exit(0);
}

const config = await getResponse.json();

console.log("\n✔ Supabase Auth updated. Current state:");
console.log(
  JSON.stringify(
    {
      mailer_autoconfirm: config.mailer_autoconfirm,
      mailer_allow_unverified_email_sign_ins:
        config.mailer_allow_unverified_email_sign_ins,
      smtp_host: config.smtp_host,
      smtp_admin_email: config.smtp_admin_email,
      rate_limit_email_sent: config.rate_limit_email_sent,
      smtp_max_frequency: config.smtp_max_frequency,
      external_email_enabled: config.external_email_enabled,
      external_google_enabled: config.external_google_enabled,
      site_url: config.site_url,
      uri_allow_list: config.uri_allow_list,
    },
    null,
    2,
  ),
);

if (googleOnly) {
  console.log(
    "\nGoogle sign-in is on. Email/password signup stays blocked by the app until Confirm email and SMTP are configured; /api/health keeps reporting emailSignupAllowed=false, which is correct for this mode.\n",
  );
} else {
  console.log(
    "\nNext: redeploy is not needed. Open /api/health and confirm emailSignupAllowed is true.\n",
  );
}
