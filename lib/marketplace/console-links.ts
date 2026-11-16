/**
 * Deep links into Console v2, so a viewer can open the operator side of the
 * exact record the demo just created.
 *
 * Console record pages live under `/console/{organization}/{application}/...`.
 * The two ids are the console organization and application behind API_KEY;
 * they are optional (`DIDIT_CONSOLE_ORG_ID`, `DIDIT_CONSOLE_APP_ID`), and
 * without them every link falls back to the console home and the record id is
 * shown so it can be searched for.
 */
export interface ConsoleTarget {
  origin: string;
  orgId: string | null;
  appId: string | null;
}

export type ConsoleRecord =
  | { kind: "transaction"; id: string }
  | { kind: "kyb"; id: string }
  | { kind: "kyc"; id: string }
  | { kind: "business"; id: string }
  | { kind: "network"; id: string }
  | { kind: "transactions" };

export interface ConsoleLink {
  href: string;
  /** False when the link only reaches the console home. */
  direct: boolean;
}

const enc = encodeURIComponent;

function recordPath(record: ConsoleRecord): string {
  switch (record.kind) {
    case "transaction":
      return `transactions/detail/${enc(record.id)}`;
    case "kyb":
      return `kyb/verifications/${enc(record.id)}`;
    case "kyc":
      return `kyc/verifications/${enc(record.id)}`;
    case "business":
      return `businesses/${enc(record.id)}`;
    case "network":
      return `networks/${enc(record.id)}`;
    case "transactions":
      return "transactions";
  }
}

export function consoleLink(
  target: ConsoleTarget,
  record: ConsoleRecord,
): ConsoleLink {
  const origin = target.origin.replace(/\/+$/, "");

  if (!target.orgId || !target.appId) {
    return { href: `${origin}/`, direct: false };
  }

  return {
    href: `${origin}/console/${enc(target.orgId)}/${enc(target.appId)}/${recordPath(record)}`,
    direct: true,
  };
}
