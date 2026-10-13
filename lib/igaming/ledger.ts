import type { CashierKind } from "./policy";
import type { TransactionRecord } from "./records";

/**
 * The player's wallet, derived from what Didit decided.
 *
 * Aurora Play has no ledger of its own in this demo: the balance is whatever
 * the player's monitored transactions add up to, so a deposit Didit holds for
 * ID verification is not spendable until it is approved, and a refused one
 * never was. Pure, so `npm test` covers every rule below.
 */

export interface ActivityItem {
  key: string;
  kind: CashierKind;
  amount: number;
  detail: string | null;
  at: number;
  /** The Didit transaction, or null when Didit refused to create one. */
  record: TransactionRecord | null;
  /** Didit's own words when it refused the transaction. */
  error: string | null;
  /** The HTTP status of that refusal, when Didit answered at all. */
  httpStatus?: number | null;
}

export interface Ledger {
  /** Spendable: approved money in, minus everything out that is not declined. */
  balance: number;
  /** Every deposit Didit recorded, whatever its status - what the rule sums. */
  depositedTotal: number;
  /** Deposits today that count against a daily limit. */
  depositedToday: number;
  bets: number;
  bonusClaimed: boolean;
}

const sameDay = (a: number, b: number) =>
  new Date(a).toDateString() === new Date(b).toDateString();

export function ledger(activity: ActivityItem[], now: number): Ledger {
  let balance = 0;
  let depositedTotal = 0;
  let depositedToday = 0;
  let bets = 0;
  let bonusClaimed = false;

  for (const item of activity) {
    const status = item.record?.status ?? null;

    if (!status) continue;
    const approved = status === "APPROVED";
    const declined = status === "DECLINED";

    switch (item.kind) {
      case "deposit":
        depositedTotal += item.amount;
        if (!declined && sameDay(item.at, now)) depositedToday += item.amount;
        if (approved) balance += item.amount;
        break;
      case "bonus_claim":
        bonusClaimed = true;
        if (approved) balance += item.amount;
        break;
      case "bet":
        if (!declined) {
          balance -= item.amount;
          bets += 1;
        }
        break;
      case "withdrawal":
        if (!declined) balance -= item.amount;
        break;
      case "deposit_limit":
        break;
    }
  }

  return {
    balance: Math.round(balance * 100) / 100,
    depositedTotal,
    depositedToday,
    bets,
    bonusClaimed,
  };
}

/** The transactions whose status can still move (ID check, manual review). */
export function openItems(activity: ActivityItem[]): ActivityItem[] {
  return activity.filter(
    (item) =>
      item.record !== null &&
      ["AWAITING_USER", "IN_REVIEW"].includes(item.record.status),
  );
}
