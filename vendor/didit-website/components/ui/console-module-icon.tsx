import type { ComponentType } from "react";
import {
  Plug,
  Gift,
  Copy,
  Ban,
  // Used by the site-search catalog so every row has a leading icon — same
  // Lucide family the console pulls from for non-workflow surfaces.
  Building2,
  Layers,
  Globe,
  ArrowLeftRight,
  BookOpen,
  Code,
  Boxes,
  Webhook,
  Terminal,
  Activity,
  FlaskConical,
  Tag,
  Users,
  Star,
  Mail,
  Calendar,
  ShieldCheck,
  Newspaper,
  FileCheck,
  Lock,
  Cookie,
  Scale,
  Repeat,
  Heart,
  Smile,
  Key
} from "lucide-react";

import { cn } from "@website/lib/utils";

/**
 * ConsoleModuleIcon — strict per-module icon registry that mirrors the
 * canonical workflow-feature-icon registry in `fe-application-console`
 * (`src/modules/shared/components/workflow-feature-icon.tsx`).
 *
 * Two icon sources, mirrored from the design system:
 *   1. The canonical Didit Design System module glyphs
 *      (`didit-design-system/assets/modules/`) — copied into v4 under
 *      `/public/icons/modules/` and rendered via CSS `mask-image` so
 *      they inherit the current `text-*` color. Every module
 *      (ID Verification, Liveness, Proof of Address, Database
 *      Validation, Questionnaires, Email, KYB, Wallet Screening, …)
 *      uses its dedicated DS glyph.
 *   2. Lucide fallbacks for marketing-only surfaces the design system
 *      has no glyph for (MCP server, free KYC, hub/company links).
 *      Chosen to match the DS family visually.
 *
 * Output is a single bare SVG-sized box with NO colored chip and NO
 * background — every consumer styles it via Tailwind text color tokens
 * (`text-ink`, `text-muted`, etc.) per the OpenAI-pricing reference.
 */

type IconKind = "asset" | "lucide";

/**
 * Loose icon-component type — Lucide components accept a `className`
 * prop (which is all we pass), so we type the slot as the minimum
 * shape rather than pulling in `LucideProps` generics.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = ComponentType<any>;

interface IconEntry {
  kind: IconKind;
  /** Asset file basename (without `.svg`). Required when `kind === "asset"`. */
  src?: string;
  /** Public sub-folder under `/icons/` the asset lives in. Defaults to
   *  `"modules"`; industry-vertical glyphs set `"industries"`. */
  dir?: string;
  /** Component reference. Required when `kind === "lucide"`. */
  cmp?: IconComponent;
}

const REGISTRY: Record<string, IconEntry> = {
  // ── Identity & documents ────────────────────────────────────────────
  fullKyc: { kind: "asset", src: "id-scan" }, // Full KYC bundle anchors on ID
  idVerification: { kind: "asset", src: "id-scan" },
  nfcVerification: { kind: "asset", src: "nfc" },
  proofOfAddress: { kind: "asset", src: "proof-of-address" },
  databaseValidation: { kind: "asset", src: "database-validation" },
  questionnaires: { kind: "asset", src: "questionnaires" },
  // ── Biometric & liveness ────────────────────────────────────────────
  passiveLiveness: { kind: "asset", src: "liveness" },
  activeLiveness: { kind: "asset", src: "liveness" },
  faceMatch1to1: { kind: "asset", src: "face-match" },
  faceSearch1ton: { kind: "asset", src: "face-search" },
  biometricAuth: { kind: "asset", src: "biometric-authentication" },
  ageEstimation: { kind: "asset", src: "age-estimation-18" },
  // ── AML & risk ──────────────────────────────────────────────────────
  amlScreening: { kind: "asset", src: "aml-screening" },
  ongoingAml: { kind: "asset", src: "aml-screening" },
  ipAnalysis: { kind: "asset", src: "ip-analysis" },
  // ── Contact ─────────────────────────────────────────────────────────
  emailVerification: { kind: "asset", src: "email-verification" },
  phoneVerification: { kind: "asset", src: "phone-verification" },
  // ── Business (KYB) ──────────────────────────────────────────────────
  businessVerification: { kind: "asset", src: "kyb" },
  kybCompanyAml: { kind: "asset", src: "aml-screening-business" },
  kybPersonAml: { kind: "asset", src: "aml-screening" },
  kybDocuments: { kind: "asset", src: "documents" },
  kybKeyPeople: { kind: "asset", src: "key-people" },
  // ── Transactions ────────────────────────────────────────────────────
  transactionMonitoring: { kind: "asset", src: "monitoring" },
  // Travel Rule = originator/beneficiary exchange — same counterparties
  // glyph the console's transaction-parties surfaces use.
  travelRule: { kind: "asset", src: "counterparties" },
  // ── Wallets ────────────────────────────────────────────────────────
  walletScreening: { kind: "asset", src: "wallet-screening" },
  walletScreeningManaged: { kind: "asset", src: "wallet-screening" },
  // ── Anti-fraud signals (free on every session) ─────────────────────
  dupedUsers: { kind: "lucide", cmp: Copy },
  blocklistedUsers: { kind: "lucide", cmp: Ban },
  // ── Platform ───────────────────────────────────────────────────────
  freeKyc: { kind: "lucide", cmp: Gift },
  reusableKyc: { kind: "asset", src: "reusable-kyc" },
  workflowOrchestrator: { kind: "asset", src: "workflows" },
  mcpServer: { kind: "lucide", cmp: Plug },
  whiteLabel: { kind: "asset", src: "white-label" },
  // ── Solutions / hub pages ──────────────────────────────────────────
  industries: { kind: "lucide", cmp: Building2 },
  // Industry verticals — each maps to a dedicated monochrome glyph in
  // /public/icons/industries/ (rendered via CSS mask so it inherits the
  // current text color). Every /industries/* slug shares this registry
  // so the SiteSearch row, the Navbar dropdown, the /industries catalogue
  // card, and RelatedContent all render the same glyph.
  fintech: { kind: "asset", dir: "industries", src: "fintech" },
  crypto: { kind: "asset", dir: "industries", src: "crypto" },
  banking: { kind: "asset", dir: "industries", src: "banking" },
  marketplaces: { kind: "asset", dir: "industries", src: "marketplaces" },
  mobility: { kind: "asset", dir: "industries", src: "mobility" },
  telecom: { kind: "asset", dir: "industries", src: "telecom" },
  travel: { kind: "asset", dir: "industries", src: "travel" },
  healthcare: { kind: "asset", dir: "industries", src: "healthcare" },
  insurance: { kind: "asset", dir: "industries", src: "insurance" },
  igaming: { kind: "asset", dir: "industries", src: "igaming" },
  dating: { kind: "lucide", cmp: Heart },
  socialApps: { kind: "asset", dir: "industries", src: "social-apps" },
  ecommerce: { kind: "asset", dir: "industries", src: "ecommerce" },
  government: { kind: "asset", dir: "industries", src: "government" },
  edtech: { kind: "asset", dir: "industries", src: "edtech" },
  peopletech: { kind: "asset", dir: "industries", src: "peopletech" },
  tokenization: { kind: "asset", dir: "industries", src: "tokenization" },
  biometricPayments: { kind: "lucide", cmp: Smile },
  accessControl: { kind: "lucide", cmp: Key },
  useCases: { kind: "lucide", cmp: Layers },
  countriesHub: { kind: "lucide", cmp: Globe },
  country: { kind: "lucide", cmp: Globe },
  switchHub: { kind: "lucide", cmp: ArrowLeftRight },
  competitor: { kind: "lucide", cmp: Repeat },
  // ── Developers ─────────────────────────────────────────────────────
  docs: { kind: "lucide", cmp: BookOpen },
  apiRef: { kind: "lucide", cmp: Code },
  sdks: { kind: "lucide", cmp: Boxes },
  webhooks: { kind: "lucide", cmp: Webhook },
  developersHome: { kind: "lucide", cmp: Terminal },
  status: { kind: "lucide", cmp: Activity },
  sandbox: { kind: "lucide", cmp: FlaskConical },
  // ── Company ────────────────────────────────────────────────────────
  pricing: { kind: "lucide", cmp: Tag },
  aboutUs: { kind: "lucide", cmp: Users },
  successStories: { kind: "lucide", cmp: Star },
  contact: { kind: "lucide", cmp: Mail },
  getDemo: { kind: "lucide", cmp: Calendar },
  securityCompliance: { kind: "lucide", cmp: ShieldCheck },
  // ── Resources ──────────────────────────────────────────────────────
  blog: { kind: "lucide", cmp: Newspaper },
  supportedDocuments: { kind: "lucide", cmp: FileCheck },
  privacyPolicy: { kind: "lucide", cmp: Lock },
  cookies: { kind: "lucide", cmp: Cookie },
  businessTerms: { kind: "lucide", cmp: Scale }
};

export interface ConsoleModuleIconProps {
  moduleKey: string;
  className?: string;
}

export function ConsoleModuleIcon({ moduleKey, className }: ConsoleModuleIconProps) {
  const entry = REGISTRY[moduleKey];
  if (!entry) return null;
  if (entry.kind === "asset" && entry.src) {
    const url = `/icons/${entry.dir ?? "modules"}/${entry.src}.svg`;
    return (
      <span
        aria-hidden
        data-didit-component="console-module-icon"
        data-module={moduleKey}
        data-icon-kind="asset"
        className={cn("inline-block size-5 bg-current", className)}
        style={{
          WebkitMaskImage: `url(${url})`,
          maskImage: `url(${url})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain"
        }}
      />
    );
  }
  const Cmp = entry.cmp;
  if (!Cmp) return null;
  // Lucide defaults to a 2px stroke on a 24×24 viewBox; the canonical DS
  // module glyphs (rendered above via mask) draw at `stroke-width="1.5"`.
  // Match it so the lucide fallbacks (free KYC's Gift, the MCP Plug, etc.)
  // read at the same visual weight as the asset glyphs beside them in the
  // /products grid, navbar dropdown, and pricing table.
  return (
    <Cmp
      aria-hidden
      data-didit-component="console-module-icon"
      data-module={moduleKey}
      data-icon-kind={entry.kind}
      strokeWidth={1.5}
      className={cn("size-5", className)}
    />
  );
}
