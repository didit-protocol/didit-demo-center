/**
 * The two decisions the marketplace's server takes from a KYB status: may the
 * shop be paid, and may it start a new verification. Both read Didit's
 * session status (title case, see the docs) and nothing else.
 *
 * https://docs.didit.me/integration/verification-statuses
 */
const normalize = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");

/** Payouts unlock on an approved business verification and nothing else. */
export function payoutsUnlocked(kybRaw: string | null): boolean {
  return normalize(kybRaw ?? "") === "approved";
}

/**
 * A KYB that can no longer be completed, so the shop may start a new one.
 * Every other status is either still open (resume it) or decided.
 */
export function kybRestartable(kybRaw: string | null): boolean {
  return ["declined", "expired", "abandoned", "kyc expired"].includes(
    normalize(kybRaw ?? ""),
  );
}
