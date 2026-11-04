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
