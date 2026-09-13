/**
 * Didit hands the session status back on the redirect callback as a `status`
 * query parameter. The hosted web redirect documents `Approved`, `Declined`
 * and `In Review`, and the session lifecycle carries further values a tester
 * can land on when a link is reopened or the session never finished.
 *
 * `In Review` means the session was flagged for a human reviewer - it is NOT
 * automatic processing still running, and it is not an approval.
 *
 * https://docs.didit.me/integration/web-sdks/web-redirect
 * https://docs.didit.me/integration/api-full-flow
 */
export type AccsStatusKind =
  "approved" | "declined" | "review" | "processing" | "unknown";

export type AccsStatusMeta = {
  kind: AccsStatusKind;
  label: string;
  description: string;
};

const APPROVED = ["approved", "success", "completed"];
const DECLINED = ["rejected", "declined", "failed"];
/** Statuses where automatic processing genuinely is still in flight. */
const PROCESSING = ["not started", "in progress", "pending", "processing"];

/**
 * Maps a callback status onto the copy the ACCS callback page renders.
 *
 * Anything that is not recognised keeps its raw status as the heading and gets
 * an explicitly non-committal description, so a tester is never told the
 * session is progressing, approved or rejected when we do not know that.
 */
export function resolveAccsStatus(
  status: string,
  componentLabel: string,
): AccsStatusMeta {
  const raw = status.trim();
  const normalized = raw.toLowerCase().replace(/[\s_-]+/g, " ");

  if (APPROVED.includes(normalized)) {
    return {
      kind: "approved",
      label: "Approved",
      description: `The ${componentLabel} check passed: the session was accepted.`,
    };
  }

  if (DECLINED.includes(normalized)) {
    return {
      kind: "declined",
      label: "Declined",
      description: `The ${componentLabel} check did not pass: the session was rejected.`,
    };
  }

  if (normalized.includes("review")) {
    return {
      kind: "review",
      label: "In Review",
      description: `The ${componentLabel} check was not decided automatically: the session is flagged for manual review, so it is not approved. A human reviewer issues the final Approved or Declined outcome, and this page does not update.`,
    };
  }

  if (PROCESSING.includes(normalized)) {
    return {
      kind: "processing",
      label: raw || "Pending",
      description: `The ${componentLabel} check has not finished yet: the session is still being processed.`,
    };
  }

  return {
    kind: "unknown",
    label: raw || "No status returned",
    description: raw
      ? `The callback returned the status "${raw}", which this test page does not interpret. Check the session in the Didit console for its outcome.`
      : "The callback did not include a status, so there is no outcome to show here. Check the session in the Didit console for its outcome.",
  };
}
