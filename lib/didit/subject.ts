/**
 * The name a transaction's subject carries.
 *
 * Didit's Transactions API refuses a subject without `full_name`: a 400 with
 * "subject.vendor_data and subject.full_name are required." The token gives
 * Didit the `vendor_data`; the name has to come from the page. A visitor
 * signed in with Didit Authentication has only an email until their ID check
 * reads a name, so every caller passes its candidates best first (the name
 * Didit read from the document, the name typed at sign-up, the email) and
 * the payload builders end with a brand fallback, so the name is never empty.
 *
 * No `@/` imports: `npm test` loads the policies that use it straight from Node.
 */
export function subjectName(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const name = candidate?.trim();

    if (name) return name;
  }

  return "";
}
