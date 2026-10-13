/**
 * Status copy for the marketplace, in one place.
 *
 * Two vocabularies reach this app. A verification session (the seller's KYB,
 * the representative's KYC, the buyer's age check) speaks the title-case
 * session statuses; a transaction speaks the upper-case monitoring statuses.
 * Both map onto the same four tones the rest of the demo centre uses, and an
 * unknown value keeps its raw text so nothing is ever reported as approved or
 * declined when we do not know that.
 *
 * https://docs.didit.me/integration/verification-statuses
 * https://docs.didit.me/transaction-monitoring/statuses
 */
export type StatusTone = "approved" | "review" | "declined" | "neutral";

export interface StatusMeta {
  tone: StatusTone;
  label: string;
  /** One sentence a seller, buyer or operator can act on. */
  description: string;
}

const normalize = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");

/** The seller's business verification, as the seller sees it. */
export function kybStatus(raw: string | null): StatusMeta {
  if (!raw) {
    return {
      tone: "neutral",
      label: "Not started",
      description:
        "Verify the business to unlock payouts. It takes a few minutes in the hosted flow.",
    };
  }

  switch (normalize(raw)) {
    case "approved":
      return {
        tone: "approved",
        label: "Approved",
        description:
          "The business, its key people and its documents are verified. Payouts are unlocked.",
      };
    case "declined":
      return {
        tone: "declined",
        label: "Declined",
        description:
          "The business did not pass verification. Payouts stay locked and the shop cannot sell.",
      };
    case "in review":
      return {
        tone: "review",
        label: "In review",
        description:
          "A compliance analyst has to look at the business before payouts unlock. Decide it in the operator view.",
      };
    case "awaiting user":
      return {
        tone: "review",
        label: "Waiting on key people",
        description:
          "The business is submitted. Each representative and beneficial owner still has to finish their own ID check.",
      };
    case "not started":
      return {
        tone: "neutral",
        label: "Not started",
        description:
          "The verification link is ready. Continue it to search the company registry.",
      };
    case "in progress":
      return {
        tone: "neutral",
        label: "In progress",
        description:
          "The business verification is open. Continue where you left off.",
      };
    case "resubmitted":
      return {
        tone: "review",
        label: "Resubmitted",
        description:
          "An analyst asked for a step again. Continue the verification to resubmit it.",
      };
    case "expired":
    case "abandoned":
    case "kyc expired":
      return {
        tone: "declined",
        label: raw.trim(),
        description:
          "This verification can no longer be completed. Start a new one to unlock payouts.",
      };
    default:
      return {
        tone: "neutral",
        label: raw.trim(),
        description:
          "The verification returned a status this demo does not interpret. Open it in the console to see its outcome.",
      };
  }
}

/** A representative's or owner's own ID check inside the KYB. */
export function personStatus(raw: string | null, skipped = false): StatusMeta {
  if (skipped) {
    return {
      tone: "neutral",
      label: "Skipped",
      description: "This person does not need an ID check.",
    };
  }
  if (!raw) {
    return {
      tone: "neutral",
      label: "No ID check",
      description: "The workflow does not ask this person for an ID check.",
    };
  }

  const meta = kybStatus(raw);

  if (normalize(raw) === "not started" || normalize(raw) === "in progress") {
    return {
      ...meta,
      description: "Their ID check is waiting for them to finish it.",
    };
  }

  return meta;
}

/** A monitored order, payout or sign-up. */
export function transactionStatus(raw: string | null): StatusMeta {
  switch (normalize(raw ?? "")) {
    case "approved":
      return {
        tone: "approved",
        label: "Approved",
        description: "No rule held it, so it went straight through.",
      };
    case "in review":
      return {
        tone: "review",
        label: "Held for review",
        description:
          "A monitoring rule held it. Nothing moves until an analyst decides.",
      };
    case "awaiting user":
      return {
        tone: "review",
        label: "Waiting on the customer",
        description:
          "A rule asked the customer to verify. It follows that check's decision.",
      };
    case "declined":
      return {
        tone: "declined",
        label: "Declined",
        description: "A rule or an analyst declined it.",
      };
    default:
      return {
        tone: "neutral",
        label: raw?.trim() || "Not submitted",
        description: raw
          ? "Monitoring returned a status this demo does not interpret."
          : "Nothing has been sent to monitoring yet.",
      };
  }
}

/** Payouts unlock on an approved business verification and nothing else. */
export function payoutsUnlocked(kybRaw: string | null): boolean {
  return normalize(kybRaw ?? "") === "approved";
}

/**
 * A KYB an analyst can decide from the operator view. The status endpoint
 * only moves a session that is already decided or In Review; one still
 * waiting on its key people has to wait for them.
 */
export function kybDecidable(kybRaw: string | null): boolean {
  return normalize(kybRaw ?? "") === "in review";
}

/** Transactions whose status can still move on its own. */
export function transactionSettling(raw: string | null): boolean {
  return normalize(raw ?? "") === "awaiting user";
}
