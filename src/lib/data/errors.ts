/**
 * Digest attached to schema errors so the client error boundary can recognise
 * them even though production strips error messages before they reach the
 * browser.
 */
export const SCHEMA_MISSING_DIGEST = "SPLITNEST_SCHEMA_MISSING";

export class SchemaMissingError extends Error {
  readonly digest = SCHEMA_MISSING_DIGEST;

  constructor(message: string) {
    super(message);
    this.name = "SchemaMissingError";
  }
}

/** True when PostgREST reports a table or function that does not exist. */
export function isMissingSchemaMessage(message: string): boolean {
  return /schema cache|does not exist|could not find the table|PGRST20[25]/i.test(
    message,
  );
}

export const DISCUSSION_MIGRATION = "supabase/migrations/0006_expense_discussions.sql";

export const DISCUSSION_SETUP_MESSAGE =
  `Expense discussions need a database update. Run ${DISCUSSION_MIGRATION} in the Supabase SQL editor.`;

export const POLLS_MIGRATION = "supabase/migrations/0007_group_polls.sql";

export const POLLS_SETUP_MESSAGE =
  `Group polls need a database update. Run ${POLLS_MIGRATION} in the Supabase SQL editor.`;
