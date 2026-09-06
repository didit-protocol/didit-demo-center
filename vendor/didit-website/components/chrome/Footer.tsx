import { Link } from "@website/i18n/navigation";
import { useTranslations } from "next-intl";
import { Linkedin, Twitter, Youtube, Github, Mail } from "lucide-react";
import { Footer as UiFooter, type FooterColumn } from "@website/components/ui/footer";
import { BackedBy } from "@website/components/ui/backed-by";
import { ORG } from "@website/lib/site";
import { AskAIRow } from "./AskAIRow";
import { LocaleSwitcher } from "./LocaleSwitcher";

/** Canonical social URLs — keep in sync with design/brand/social/bios.md. */
const SOCIAL_LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/91001155", Icon: Linkedin },
  { label: "X (Twitter)", href: "https://x.com/getdidit", Icon: Twitter },
  { label: "YouTube", href: "https://www.youtube.com/@getdidit", Icon: Youtube },
  { label: "GitHub", href: "https://github.com/didit-protocol", Icon: Github }
] as const;

function FooterAside() {
  const tI18n = useTranslations("translation_v1.chrome.footer.cols");
  return (
    <div className="flex flex-wrap items-center gap-2">
      {SOCIAL_LINKS.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Didit on ${label}`}
          className="inline-flex size-10 items-center justify-center rounded-pill bg-canvas/[0.08] text-canvas/85 transition-colors duration-fast hover:bg-canvas/[0.14] hover:text-canvas focus-visible:shadow-ring focus-visible:outline-none"
        >
          <Icon className="size-[18px]" aria-hidden />
        </a>
      ))}
      <LocaleSwitcher tone="ink" side="top" align="end" showLabel />
    </div>
  );
}

const DOCS_BASE = "https://docs.didit.me";

/** Official G2 mark (Simple Icons path) — white disc so the cut-out
 *  letters read white-on-red like the canonical logo, on any canvas. */
function G2Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <circle cx="12" cy="12" r="12" fill="#FFFFFF" />
      <path
        fill="#FF492C"
        d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm.122 5.143c.45 0 .9.044 1.342.132l-1.342 2.806C9.962 8.08 8.203 9.84 8.203 12s1.76 3.92 3.92 3.92c.937 0 1.844-.338 2.553-.951l1.483 2.572A6.856 6.856 0 0 1 5.266 12a6.856 6.856 0 0 1 6.856-6.856Zm3.498.49a1.262 1.262 0 0 1 .026 0c.427 0 .792.113 1.101.34.31.229.466.546.466.946 0 .639-.36 1.03-1.035 1.376l-.377.191c-.403.204-.602.385-.657.706h2.05v.85h-3.101v-.144c0-.526.103-.96.314-1.306.211-.345.576-.65 1.102-.917l.242-.117c.427-.216.538-.401.538-.625 0-.266-.228-.458-.6-.458-.44 0-.773.228-1.004.694l-.592-.595c.13-.279.338-.502.619-.675a1.7 1.7 0 0 1 .908-.266Zm-2.094 5.388h3.394l1.697 2.937-1.697 2.94-1.697-2.94H11.83l1.696-2.937Z"
      />
    </svg>
  );
}

const STAR_PATH =
  "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d={STAR_PATH} />
    </svg>
  );
}

/**
 * G2 rating strip — logo · 4.9-of-5 star row · score · category line.
 * Links out to the Didit G2 reviews page in a new tab.
 * Rating source: g2.com Didit Identity Verification.
 */
function G2RatingBadge({ score, tagline, aria }: { score: string; tagline: string; aria: string }) {
  const fillPct = `${(parseFloat(score) / 5) * 100}%`;
  return (
    <a
      href="https://www.g2.com/products/didit-identity-verification/reviews"
      target="_blank"
      rel="noopener noreferrer"
      className="mt-6 block"
      aria-label={aria}
    >
      <div className="flex items-center gap-3">
        <G2Logo className="size-6 shrink-0" />
        {/* Star row — outline layer + width-clipped filled overlay so the
            last star renders the fractional 4.9 fill. */}
        <span className="relative inline-flex shrink-0" aria-hidden>
          <span className="inline-flex gap-0.5 text-canvas/25">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className="size-4" />
            ))}
          </span>
          <span
            className="absolute inset-y-0 start-0 overflow-hidden whitespace-nowrap"
            style={{ width: fillPct }}
          >
            <span className="inline-flex gap-0.5 text-canvas">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="size-4" />
              ))}
            </span>
          </span>
        </span>
        <span className="font-display text-sm font-medium text-canvas">{score}</span>
      </div>
      <p className="mt-2 text-sm text-canvas/70">{tagline}</p>
    </a>
  );
}

/**
 * Footer — 2-tier information architecture sized for compact height.
 *
 *   Tier 1 (primary row, sits next to the brand block)
 *     1. SOLUTIONS  — 19 items, multiColumn, no icons. Outcome anchors
 *                     + specific use cases. Mirrors the Solutions
 *                     mega-menu Use cases column.
 *     2. PRODUCTS   — 19 items, multiColumn + per-link icons. 4
 *                     product lines (UV / BV / TM / KYT) + AML
 *                     Screening + atomic modules.
 *
 *   Tier 2 (secondary row, spans full width — four columns)
 *     3. INDUSTRIES         — 12 items, multiColumn + per-link icons.
 *     4. DEVELOPERS         — 11 items, single column, no icons.
 *     5. PRICING & COMPARE  — 10 items, single column.
 *     6. COMPANY            — 8 items, single column.
 *
 * Order signals priority — Solutions is column 1 because the buyer
 * thinks in problems first, not SKUs.
 */
export function Footer() {
  const tCols = useTranslations("translation_v1.chrome.footer.cols");
  const tFooter = useTranslations("translation_v1.chrome.footer");
  const tLegal = useTranslations("translation_v1.chrome.footer.legal");
  const tBlogArchive = useTranslations("translation_v1.blog.archive");

  const columns: FooterColumn[] = [
    {
      heading: tCols("solutions.heading"),
      multiColumn: true,
      links: [
        // Only `/solutions/*` workflow slugs. Ordered by ICP impact
        // across Didit's four ICPs (fintech / crypto / marketplaces /
        // iGaming), matched in count to the Products column. The 4
        // GTM bundles + AML Screening live in Products.
        // Universal flagships
        { label: tCols("solutions.fullKycOnboarding"), href: "/solutions/full-kyc-onboarding" },
        { label: tCols("solutions.ageVerification"), href: "/solutions/age-verification" },
        // Tier-1 ICP plays
        { label: tCols("solutions.cryptoOnramp"), href: "/solutions/crypto-onramp-kyc-kyt" },
        { label: tCols("solutions.accountTakeover"), href: "/solutions/account-takeover" },
        { label: tCols("solutions.multiAccountAbuse"), href: "/solutions/multi-account-abuse" },
        {
          label: tCols("solutions.gigWorkerVerification"),
          href: "/solutions/gig-worker-verification"
        },
        { label: tCols("solutions.proofOfHuman"), href: "/solutions/proof-of-human" },
        { label: tCols("solutions.botDetection"), href: "/solutions/bot-detection" },
        // Regulated workflows
        {
          label: tCols("solutions.igamingResponsibleGaming"),
          href: "/solutions/igaming-responsible-gaming"
        },
        { label: tCols("solutions.micaCrypto"), href: "/solutions/mica-crypto-user-verification" },
        { label: tCols("solutions.cryptoTravelRule"), href: "/solutions/crypto-travel-rule" },
        { label: tCols("solutions.uboVerification"), href: "/solutions/ubo-verification-6amld" },
        { label: tCols("solutions.bnplUnderwriting"), href: "/solutions/bnpl-underwriting" },
        { label: tCols("solutions.psd3Sca"), href: "/solutions/psd3-sca" },
        // Operational workflows
        {
          label: tCols("solutions.marketplaceSellerKyb"),
          href: "/solutions/marketplace-seller-kyb"
        },
        { label: tCols("solutions.employeeOnboarding"), href: "/solutions/employee-onboarding" },
        { label: tCols("solutions.nfcEpassport"), href: "/solutions/nfc-epassport-onboarding" },
        { label: tCols("solutions.passwordRecovery"), href: "/solutions/password-recovery" },
        { label: tCols("solutions.seeAll"), href: "/solutions", accent: true }
      ]
    },
    {
      heading: tCols("products.heading"),
      // multiColumn + per-link icons: the slot gets a wide 2.6fr
      // template width so each sub-column has room for glyph + label
      // without wrapping. 19 items → ~10-tall column.
      multiColumn: true,
      // Product glyphs render larger (1.3rem) and in a fixed mid-soft
      // grey (#C4C7C7) regardless of hover, per brand direction.
      iconClassName: "size-[1.3rem] text-[#C4C7C7] group-hover:text-[#C4C7C7]",
      links: [
        // Product lines first (the 4 GTM bundles) — they're the
        // primary catalogue entries the buyer scans for. Atomic
        // modules follow, grouped by category (identity → biometric
        // → fraud → contact → platform).
        // User Verification (KYC) lands on the Free-tier surface to
        // match the navbar card; the retired
        // `/products/user-verification` URL 301-redirects via
        // `src/lib/redirects.mjs`.
        {
          label: tCols("products.userVerification"),
          href: "/products/free-kyc",
          iconKey: "freeKyc"
        },
        {
          label: tCols("products.businessVerification"),
          href: "/products/business-verification",
          iconKey: "businessVerification"
        },
        {
          label: tCols("products.transactionMonitoring"),
          href: "/products/transaction-monitoring",
          iconKey: "transactionMonitoring"
        },
        {
          label: tCols("products.walletScreening"),
          href: "/products/wallet-screening",
          iconKey: "walletScreening"
        },
        {
          label: tCols("products.amlScreening"),
          href: "/products/aml-screening",
          iconKey: "amlScreening"
        },
        // Identity + biometric atomics
        {
          label: tCols("products.idVerification"),
          href: "/products/id-verification",
          iconKey: "idVerification"
        },
        {
          label: tCols("products.liveness"),
          href: "/products/liveness",
          iconKey: "passiveLiveness"
        },
        {
          label: tCols("products.faceMatch1to1"),
          href: "/products/face-match-1to1",
          iconKey: "faceMatch1to1"
        },
        {
          label: tCols("products.faceSearch1toN"),
          href: "/products/face-search-1ton",
          iconKey: "faceSearch1ton"
        },
        {
          label: tCols("products.biometricAuth"),
          href: "/products/biometric-authentication",
          iconKey: "biometricAuth"
        },
        {
          label: tCols("products.ageEstimation"),
          href: "/products/age-estimation",
          iconKey: "ageEstimation"
        },
        // Document + registry atomics
        {
          label: tCols("products.nfcReading"),
          href: "/products/nfc-verification",
          iconKey: "nfcVerification"
        },
        {
          label: tCols("products.databaseValidation"),
          href: "/products/database-validation",
          iconKey: "databaseValidation"
        },
        // Risk / contact atomics
        {
          label: tCols("products.ipAnalysis"),
          href: "/products/device-ip-analysis",
          iconKey: "ipAnalysis"
        },
        {
          label: tCols("products.emailVerification"),
          href: "/products/email-verification",
          iconKey: "emailVerification"
        },
        {
          label: tCols("products.phoneVerification"),
          href: "/products/phone-verification",
          iconKey: "phoneVerification"
        },
        // Platform tools
        {
          label: tCols("products.workflowOrchestrator"),
          href: "/products/workflow-orchestrator",
          iconKey: "workflowOrchestrator"
        },
        {
          label: tCols("products.whiteLabel"),
          href: "/products/white-label",
          iconKey: "whiteLabel"
        },
        { label: tCols("products.seeAllModules"), href: "/products", accent: true }
      ]
    },
    {
      heading: tCols("industries.heading"),
      // 2-col flow with industry glyphs. 12 items → ~6-tall column.
      multiColumn: true,
      // Match the Products column — larger 1.3rem glyphs in a fixed
      // mid-soft grey (#C4C7C7), steady on hover.
      iconClassName: "size-[1.3rem] text-[#C4C7C7] group-hover:text-[#C4C7C7]",
      links: [
        {
          label: tCols("industries.fintech"),
          href: "/industries/identity-verification-fintech",
          iconKey: "fintech"
        },
        {
          label: tCols("industries.crypto"),
          href: "/industries/identity-verification-crypto",
          iconKey: "crypto"
        },
        {
          label: tCols("industries.marketplaces"),
          href: "/industries/identity-verification-marketplaces",
          iconKey: "marketplaces"
        },
        {
          label: tCols("industries.mobility"),
          href: "/industries/identity-verification-mobility",
          iconKey: "mobility"
        },
        {
          label: tCols("industries.gambling"),
          href: "/industries/identity-verification-igaming",
          iconKey: "igaming"
        },
        {
          label: tCols("industries.banking"),
          href: "/industries/identity-verification-banking",
          iconKey: "banking"
        },
        {
          label: tCols("industries.insurance"),
          href: "/industries/identity-verification-insurance",
          iconKey: "insurance"
        },
        {
          label: tCols("industries.ecommerce"),
          href: "/industries/identity-verification-ecommerce",
          iconKey: "ecommerce"
        },
        {
          label: tCols("industries.telecom"),
          href: "/industries/identity-verification-telecom",
          iconKey: "telecom"
        },
        { label: tCols("industries.seeAll"), href: "/industries", accent: true }
      ]
    }
  ];

  // Tier 1 — catalogue columns that sit next to the brand block.
  // Solutions has no icons (19 items, multiColumn flow → ~10 tall).
  // Products carries module glyphs.
  const primaryColumns = columns.slice(0, 2);

  // Tier 2 — secondary row spans full width. Four columns:
  // Industries (multiColumn + icons), Developers, Pricing & Compare,
  // Company. Industries gets the wider slot per the slotWidth rules
  // in `src/components/ui/footer.tsx`; the other three render as
  // single columns at 1fr each.
  const secondaryColumns: FooterColumn[] = [
    columns[2],
    {
      heading: tCols("developers.heading"),
      links: [
        { label: tCols("developers.documentation"), href: DOCS_BASE, external: true },
        {
          label: tCols("developers.apiReference"),
          href: `${DOCS_BASE}/api-reference`,
          external: true
        },
        {
          label: tCols("developers.quickstart"),
          href: `${DOCS_BASE}/getting-started/quick-start`,
          external: true
        },
        {
          label: tCols("developers.integrationPrompt"),
          href: `${DOCS_BASE}/integration/integration-prompt`,
          external: true
        },
        { label: tCols("developers.mcp"), href: `${DOCS_BASE}/mcp`, external: true },
        {
          label: tCols("developers.agentSkills"),
          href: `${DOCS_BASE}/getting-started/agent-skills`,
          external: true
        },
        {
          label: tCols("developers.sdks"),
          href: `${DOCS_BASE}/integration/web-sdks/overview`,
          external: true
        },
        { label: tCols("developers.sandbox"), href: "https://business.didit.me", external: true },
        { label: tCols("developers.changelog"), href: `${DOCS_BASE}/changelog`, external: true },
        { label: tCols("developers.status"), href: "https://status.didit.me", external: true },
        { label: tCols("developers.demoCenter"), href: "https://demos.didit.me", external: true }
      ]
    },
    {
      heading: tCols("comparePricing.heading"),
      links: [
        { label: tCols("comparePricing.pricing"), href: "/pricing" },
        { label: tCols("comparePricing.sumsub"), href: "/switch/sumsub-alternative" },
        { label: tCols("comparePricing.veriff"), href: "/switch/veriff-alternative" },
        { label: tCols("comparePricing.onfido"), href: "/switch/onfido-alternative" },
        { label: tCols("comparePricing.jumio"), href: "/switch/jumio-alternative" },
        { label: tCols("comparePricing.persona"), href: "/switch/persona-alternative" },
        {
          label: tCols("comparePricing.stripeIdentity"),
          href: "/switch/stripe-identity-alternative"
        },
        { label: tCols("comparePricing.countries"), href: "/solutions/countries" },
        { label: tCols("comparePricing.supportedDocuments"), href: "/supported-documents" },
        { label: tCols("comparePricing.allSwitch"), href: "/switch", accent: true }
      ]
    },
    {
      heading: tCols("company.heading"),
      links: [
        { label: tCols("company.about"), href: "/about-us" },
        { label: tCols("company.blog"), href: "/blog" },
        { label: tBlogArchive("browseAll"), href: "/blog/archive/" },
        { label: tCols("company.successStories"), href: "/success-stories" },
        { label: tCols("company.securityCompliance"), href: "/security-compliance" },
        { label: tCols("company.brand"), href: "/brand" },
        { label: tCols("company.support"), href: "/support" },
        { label: tCols("company.helpCenter"), href: "https://help.didit.me", external: true },
        { label: tCols("company.contact"), href: "/get-a-demo" },
        { label: tCols("company.getDemo"), href: "/get-a-demo" },
        {
          label: tCols("company.careers"),
          href: "https://didit.jobs.personio.com/",
          external: true
        }
      ]
    }
  ];

  return (
    <>
      <AskAIRow />
      <UiFooter
        data-didit-component="footer"
        tone="ink"
        blurb={
          <>
            <p className="font-display text-base font-medium tracking-[-0.015em] text-canvas">
              {tFooter("tagline")}
            </p>
            <p className="mt-3 text-xs text-canvas/60">{tFooter("trustStrip")}</p>
            <p className="mt-3 text-xs text-canvas/60">
              {tFooter("regulatorMicroline")}{" "}
              <Link className="underline underline-offset-2" href="/security-compliance#regulator">
                {tFooter("regulatorReadReport")}
              </Link>
            </p>
            <span className="mt-6 block">
              <BackedBy
                align="start"
                size="sm"
                density="spacious"
                vivid
                onDark
                // Links the Robinhood lockup at Robinhood Ventures' fund
                // listing. BackedBy renders href'd logos with target="_blank"
                // + rel="noopener".
                coInvestorHref="https://robinhood.com/us/en/stocks/RVII/"
                label={tFooter("backedBy")}
                investors={[
                  {
                    name: tCols("backedby.investors.name.yCombinator"),
                    logo: "/logos/investors/yc_logo.svg",
                    aspectRatio: 4.94,
                    height: 27,
                    // Links to Didit's YC company profile. BackedBy renders
                    // href'd logos with target="_blank" + rel="noopener".
                    href: "https://www.ycombinator.com/companies/didit"
                  }
                ]}
              />
            </span>
            {/* HQ line — small mono caps sits flush below the BackedBy
              chip, before the column grid begins. Doubles as the schema
              org PostalAddress signal when crawlers parse this footer. */}
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-canvas/55">
              {tFooter("hq")}
            </p>
            {/* Contact email — sits with the HQ line as the footer's
              contact block, and doubles as the schema org email signal.
              Normal-case (emails read wrong in uppercase) but kept in the
              same mono micro-scale as the HQ line above it. */}
            <a
              href={`mailto:${ORG.email}`}
              aria-label="Email Didit"
              className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.06em] text-canvas/55 transition-colors duration-fast hover:text-canvas/85"
            >
              <Mail className="size-3" aria-hidden />
              {ORG.email}
            </a>
            {/* Score also appears inside the translated g2Aria string —
                update messages/en.json in the same commit when it changes. */}
            <G2RatingBadge score="4.9" tagline={tFooter("g2Tagline")} aria={tFooter("g2Aria")} />
          </>
        }
        columns={primaryColumns}
        secondaryColumns={secondaryColumns}
        aside={<FooterAside />}
        legal={
          <span>
            {tLegal("copyright")} ·{" "}
            <Link href="/terms/privacy-policy" className="underline-offset-2 hover:underline">
              {tLegal("privacy")}
            </Link>{" "}
            ·{" "}
            <Link href="/terms/cookies" className="underline-offset-2 hover:underline">
              {tLegal("cookies")}
            </Link>{" "}
            ·{" "}
            <Link href="/terms/business" className="underline-offset-2 hover:underline">
              {tLegal("businessTerms")}
            </Link>{" "}
            ·{" "}
            <Link href="/get-a-demo" className="underline-offset-2 hover:underline">
              {tLegal("contact")}
            </Link>
          </span>
        }
      />
    </>
  );
}
