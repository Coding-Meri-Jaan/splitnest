#!/usr/bin/env node
/**
 * Configures Supabase Auth so email/password signup is actually verified.
 *
 * This is the external half of the fake-email fix: the app refuses email
 * signups while the project auto-confirms addresses, so run this once with a
 * personal access token and SMTP credentials.
 *
 *   npm run auth:configure -- --dry-run
 *   npm run auth:configure
 *
 * Required values live in .env.local (gitignored):
 *   SUPABASE_ACCESS_TOKEN   https://supabase.com/dashboard/account/tokens
 *   AUTH_SMTP_HOST          e.g. smtp.sendgrid.net / smtp.brevo.com
 *   AUTH_SMTP_USER          SMTP username (SendGrid uses "apikey")
 *   AUTH_SMTP_PASS          SMTP password / API key
 *   AUTH_SMTP_FROM          verified sender address
 *   AUTH_SITE_URL           https://splitnest-payments.netlify.app
 *
 * Optional:
 *   SUPABASE_PROJECT_REF    derived from NEXT_PUBLIC_SUPABASE_URL when absent
 *   AUTH_SMTP_PORT          default 587
 *   AUTH_SMTP_SENDER_NAME   default "SplitNest"
 *   AUTH_REDIRECT_URLS      comma-separated; defaults to <site>/auth/confirm
 *                           plus http://localhost:3000/auth/confirm
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 */

const dryRun = process.argv.includes("--dry-run");

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
const googleClientId = value("GOOGLE_CLIENT_ID");
const googleClientSecret = value("GOOGLE_CLIENT_SECRET");

if (!dryRun && !token) {
  fail(
    "SUPABASE_ACCESS_TOKEN is missing. Create one at https://supabase.com/dashboard/account/tokens.",
  );
}
if (!siteUrl) {
  fail("AUTH_SITE_URL is missing (for example https://splitnest-payments.netlify.app).");
}
if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
  fail(
    "AUTH_SMTP_HOST, AUTH_SMTP_USER, AUTH_SMTP_PASS, and AUTH_SMTP_FROM are required. Connect an SMTP provider first (SendGrid, Brevo, Resend, Postmark, SES).",
  );
}
if (Boolean(googleClientId) !== Boolean(googleClientSecret)) {
  fail("Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither.");
}

const redirects =
  value("AUTH_REDIRECT_URLS") ||
  [`${siteUrl}/auth/confirm`, "http://localhost:3000/auth/confirm"].join(",");

const payload = {
  // The two settings that make fake emails impossible through this app.
  mailer_autoconfirm: false,
  mailer_allow_unverified_email_sign_ins: false,
  external_email_enabled: true,
  mailer_secure_email_change_enabled: true,

  smtp_host: smtpHost,
  smtp_port: smtpPort,
  smtp_user: smtpUser,
  smtp_pass: smtpPass,
  smtp_admin_email: smtpFrom,
  smtp_sender_name: senderName,

  site_url: siteUrl,
  uri_allow_list: redirects,
};

if (googleClientId && googleClientSecret) {
  payload.external_google_enabled = true;
  payload.external_google_client_id = googleClientId;
  payload.external_google_secret = googleClientSecret;
}

console.log(`\nProject: ${ref}`);
console.log(`Site URL: ${siteUrl}`);
console.log(`SMTP: ${smtpHost}:${smtpPort} as ${smtpUser}`);
console.log(`Sender: ${senderName} <${smtpFrom}>`);
console.log(`Redirects: ${redirects}`);

if (dryRun) {
  console.log("\nDry run payload (secrets masked):");
  console.log(
    JSON.stringify(
      {
        ...payload,
        smtp_pass: "***",
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
      external_email_enabled: config.external_email_enabled,
      external_google_enabled: config.external_google_enabled,
      site_url: config.site_url,
      uri_allow_list: config.uri_allow_list,
    },
    null,
    2,
  ),
);
console.log(
  "\nNext: redeploy is not needed. Open /api/health and confirm emailSignupAllowed is true.\n",
);
