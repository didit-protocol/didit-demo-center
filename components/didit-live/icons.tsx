import type { Tone } from "@/lib/didit/live";

import {
  ArrowLeftRight,
  Ban,
  Fingerprint,
  KeyRound,
  ScanFace,
  Timer,
} from "lucide-react";

/** One icon per product, and for on hold and blocked, as on the LiveLayer board. */
export function ToneIcon({ tone, size = 16 }: { tone: Tone; size?: number }) {
  const props = { size, strokeWidth: 2, "aria-hidden": true } as const;

  switch (tone) {
    case "auth":
      return <KeyRound {...props} />;
    case "sig":
      return <Fingerprint {...props} />;
    case "ver":
      return <ScanFace {...props} />;
    case "txn":
      return <ArrowLeftRight {...props} />;
    case "hold":
      return <Timer {...props} />;
    default:
      return <Ban {...props} />;
  }
}

export const TONE_CLASS: Record<Tone, string> = {
  auth: "p-auth",
  sig: "p-sig",
  ver: "p-ver",
  txn: "p-txn",
  hold: "p-hold",
  stop: "p-stop",
};

/** The Didit symbol, the gradient ring. */
export function DiditRing({ className }: { className?: string }) {
  return <img alt="" className={className} src="/brand/didit-symbol.svg" />;
}
