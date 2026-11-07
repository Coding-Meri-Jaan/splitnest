#!/usr/bin/env node
/**
 * Forces accounts that were created before the email-confirmation gate through
 * real inbox verification.
 *
 * Why this exists:
 *   Supabase used to auto-confirm every address, so an email-only account from
 *   that period is marked confirmed even if the inbox was never proven. Google
 *   identities are already verified by Google and are skipped. Email-only
 *   accounts have their confirmation cleared and are sent a fresh confirmation
 *   link, so they cannot use the app again until they prove they can open the
 *   mailbox.
 *
 * Safety:
 *   - Dry-run by default. Nothing changes unless you pass --apply.
 *   - --apply refuses to run while Supabase still auto-confirms addresses or
 *     while no custom SMTP host is configured. Otherwise people would be
 *     locked out with no way to receive the link.
 *   - If sending the confirmation email fails, the previous confirmation is
 *     restored so the account is not stranded.
 *   - Google-linked accounts, accounts with no email, and already-unconfirmed
 *     accounts are never touched.
 *
 * Usage:
 *   npm run auth:reverify -- --dry-run
 *   npm run auth:reverify -- --apply
 *   npm run auth:reverify -- --apply --only someone@example.com
 *
 * Required in .env.local:
 *   SUPABASE_ACCESS_TOKEN   https://supabase.com/dashboard/account/tokens
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 * Optional:
 *   SUPABASE_PROJECT_REF    derived from NEXT_PUBLIC_SUPABASE_URL when absent
 */

const apply = process.argv.includes("--apply");
const onlyIndex = process.argv.indexOf("--only");
const onlyEmail =
  onlyIndex > -1 && process.argv[onlyIndex + 1]
    ? process.argv[onlyIndex + 1].trim().toLowerCase()
    : null;

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
  const match = /^https?:\/\/([a-z0-9]+)\.supabase\.co/i.exec(url);
  if (match) return match[1];

  const dashboard = /\/dashboard\/project\/([a-z0-9]+)/i.exec(url);
  if (dashboard) return dashboard[1];

  fail(
    "Set SUPABASE_PROJECT_REF, or NEXT_PUBLIC_SUPABASE_URL, in .env.local.",
  );
}

function maskEmail(email) {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

function sqlString(input) {
  return `'${String(input).replace(/'/g, "''")}'`;
}

const token = value("SUPABASE_ACCESS_TOKEN");
const siteUrl = value("NEXT_PUBLIC_SITE_URL").replace(/\/+$/, "");
const anonKey = value("NEXT_PUBLIC_SUPABASE_ANON_KEY");

if (!token) {
  fail(
    "SUPABASE_ACCESS_TOKEN is missing. Create one at https://supabase.com/dashboard/account/tokens.",
  );
}
if (!anonKey) {
  fail("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.");
}

const ref = projectRef();
const projectUrl = `https://${ref}.supabase.co`;
const managementHeaders = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function management(path, options = {}) {
  const response = await fetch(`https://api.supabase.com/v1${path}`, {
    ...options,
    headers: { ...managementHeaders, ...(options.headers ?? {}) },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function runSql(query) {
  const result = await management(
    `/projects/${ref}/database/query`,
    { method: "POST", body: JSON.stringify({ query }) },
  );
  return Array.isArray(result) ? result : [];
}

async function resendConfirmation(email) {
  const response = await fetch(
    `${projectUrl}/auth/v1/resend?redirect_to=${encodeURIComponent(
      `${siteUrl || projectUrl}/auth/confirm?next=/dashboard`,
    )}`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "signup", email }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }
}

async function main() {
  console.log(`\nProject: ${ref}`);
  console.log(`Mode: ${apply ? "APPLY" : "dry run (no changes)"}`);
  if (onlyEmail) console.log(`Only: ${maskEmail(onlyEmail)}`);

  const config = await management(`/projects/${ref}/config/auth`);

  if (apply) {
    if (config.mailer_autoconfirm !== false) {
      fail(
        "Supabase still auto-confirms addresses (mailer_autoconfirm is not false). Run npm run auth:configure first so a confirmation link is actually required.",
      );
    }
    if (!config.smtp_host) {
      fail(
        "No custom SMTP host is configured. Run npm run auth:configure with AUTH_SMTP_* values first, otherwise the confirmation email cannot be delivered.",
      );
    }
  } else if (config.mailer_autoconfirm !== false || !config.smtp_host) {
    console.log(
      "\n⚠ Real delivery is not ready yet. --apply will refuse until Confirm email and custom SMTP are configured.",
    );
  }

  const users = await runSql(`
    select
      u.id,
      u.email,
      u.email_confirmed_at,
      u.created_at,
      coalesce(
        (select string_agg(i.provider, ',' order by i.provider)
         from auth.identities i where i.user_id = u.id),
        ''
      ) as providers
    from auth.users u
    where u.email is not null
    order by u.created_at;
  `);

  const candidates = users.filter((user) => {
    const providers = (user.providers ?? "").split(",").filter(Boolean);
    const hasGoogle = providers.includes("google");
    const hasEmail = providers.includes("email");
    const confirmed = Boolean(user.email_confirmed_at);
    if (!hasEmail || hasGoogle || !confirmed) return false;
    if (onlyEmail && user.email.toLowerCase() !== onlyEmail) return false;
    return true;
  });

  console.log(
    `\nAccounts: ${users.length} total, ${candidates.length} email-only account(s) needing verification.`,
  );

  for (const user of users) {
    const providers = (user.providers ?? "").split(",").filter(Boolean);
    const status = user.email_confirmed_at ? "confirmed" : "unconfirmed";
    const kind = providers.includes("google")
      ? "google-verified"
      : providers.includes("email")
        ? "email-only"
        : "no-identity";
    console.log(`  - ${maskEmail(user.email)}  ${kind}  ${status}`);
  }

  if (candidates.length === 0) {
    console.log("\n✔ Nothing to re-verify. No changes made.\n");
    return;
  }

  if (!apply) {
    console.log(
      "\nDry run complete. Re-run with --apply after SMTP is configured to clear these confirmations and send fresh links.\n",
    );
    return;
  }

  let changed = 0;
  let failed = 0;

  for (const user of candidates) {
    const previous = user.email_confirmed_at;
    console.log(`\n→ ${maskEmail(user.email)}`);

    try {
      await runSql(`
        update auth.users u
        set email_confirmed_at = null,
            confirmation_sent_at = null
        where u.id = ${sqlString(user.id)}
          and not exists (
            select 1 from auth.identities i
            where i.user_id = u.id and i.provider = 'google'
          );
      `);

      try {
        await resendConfirmation(user.email);
        changed += 1;
        console.log("   confirmation cleared; link sent");
      } catch (error) {
        await runSql(`
          update auth.users
          set email_confirmed_at = ${sqlString(previous)}
          where id = ${sqlString(user.id)};
        `);
        failed += 1;
        console.log(
          `   could not send the link, previous confirmation restored: ${error.message}`,
        );
      }

      // Read back the current state so the operator sees what happened.
      const [current] = await runSql(`
        select email_confirmed_at
        from auth.users
        where id = ${sqlString(user.id)};
      `);
      console.log(
        `   now: ${current?.email_confirmed_at ? "confirmed" : "unconfirmed"}`,
      );
    } catch (error) {
      failed += 1;
      console.log(`   failed: ${error.message}`);
    }
  }

  console.log(
    `\n✔ ${changed} account(s) reset and emailed, ${failed} failed.`,
  );
  console.log(
    "They must open the new link before they can sign in again. Google-linked accounts were skipped.\n",
  );
}

main().catch((error) => fail(error.message));
