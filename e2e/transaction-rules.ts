/**
 * What Didit's `POST /v1/transactions/` refuses before any rule runs, so the
 * mocks answer a bad payload the way production does instead of approving it.
 *
 * The subject's `vendor_data` comes from the transaction token; the name has
 * to come from the page. Production runs with Didit Authentication on, where a
 * visitor has only an email until their ID check reads a name, and every
 * cashier action failed there with this 400 while this suite (Authentication
 * off, a typed name) stayed green.
 */
export function refusedTransaction(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const subject = (body.subject ?? {}) as { fullName?: unknown };
  const name =
    typeof subject.fullName === "string" ? subject.fullName.trim() : "";

  return name
    ? null
    : {
        subject: ["subject.vendor_data and subject.full_name are required."],
      };
}
