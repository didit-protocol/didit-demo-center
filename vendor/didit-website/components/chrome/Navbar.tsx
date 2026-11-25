"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Navbar as UiNavbar, type NavItem } from "@website/components/ui/navbar";
import { LogoContextMenu } from "@website/components/ui/logo-context-menu";
import { LocaleSwitcher } from "./LocaleSwitcher";

const DOCS_BASE = "https://docs.didit.me";
const BUSINESS_BASE = "https://business.didit.me";

function SiteSearchFallback() {
  return (
    <button
      type="button"
      aria-label="Search"
      className="inline-flex h-10 w-10 items-center justify-center rounded-pill text-ink transition-opacity duration-fast hover:bg-black/[0.04] focus-visible:shadow-ring focus-visible:outline-none"
      disabled
    >
      <Search className="size-[18px]" aria-hidden />
    </button>
  );
}

const SiteSearch = dynamic(() => import("./SiteSearch").then((mod) => mod.SiteSearch), {
  ssr: false,
  loading: SiteSearchFallback
});

/**
 * Translation-key-driven Didit Navbar — use-case-led structure.
 *
 * Four top-level items: Solutions · Developers · Resources · Pricing.
 * Products top-level removed per Alberto: "I don't want to sell a
 * product, I want to sell the use case to solve a problem." The product
 * pages still exist (/products/*) and remain reachable from inside the
 * Solutions menu's "By module" column.
 *
 *   1. Solutions   - The everything-menu, problem-led from top to bottom.
 *                    Stacked-hero layout: 4 PROBLEM-LED gradient cards on
 *                    top (Onboard a customer · Verify a business · Stop
 *                    fraud · Comply with AML), then 3 link columns below
 *                    (Use cases · By industry · By module). Reads to a
 *                    risk/compliance/PM buyer: "what problem can Didit
 *                    solve for me, and what would I build to solve it?"
 *   2. Developers  - Animated terminal Quickstart card + Build + Ship
 *                    columns + "Developer hub" → /developers.
 *   3. Resources   - Founders image card + Company column.
 *   4. Pricing     - direct link to /pricing.
 *
 * Primary CTA: "Talk to us" → /get-a-demo. Secondary: "Sign in".
 *
 * The hero gradient cards on Solutions sell JOBS, not SKUs. Each title
 * starts with an action verb the buyer would speak in a sales call
 * ("Onboard a customer"), not a product noun ("User Verification"). The
 * card description names the modules the workflow uses, so the catalogue
 * is implicit — the buyer learns it ships once they pick the problem.
 */
export function Navbar() {
  const tNav = useTranslations("translation_v1.chrome.header.nav");
  const tSolutions = useTranslations("translation_v1.chrome.header.solutions");
  const tDevs = useTranslations("translation_v1.chrome.header.developers");
  const tResources = useTranslations("translation_v1.chrome.header.resources");
  const tCtas = useTranslations("translation_v1.chrome.header.ctas");

  const items: NavItem[] = [
    {
      label: tNav("labels.solutions"),
      dropdown: {
        // Stacked-hero layout — 4 problem-led gradient cards span full
        // width on top, 3 link columns sit below. The cards SELL THE
        // PROBLEM, not the product: "Onboard a customer", "Verify a
        // business", "Stop fraud", "Comply with AML" — the verbs a
        // buyer types into a sales call. Eyebrow descriptions name the
        // modules each workflow ships with so the catalogue stays
        // implicit but discoverable.
        stackedHero: true,
        primaryCards: [
          {
            label: tSolutions("cards.onboardCustomer.title"),
            // CTA target swapped to `/products/free-kyc` per Alberto —
            // the card lede now opens on the 500-free-per-month anchor
            // so the click belongs on the free-tier landing, not the
            // generic User Verification umbrella.
            href: "/products/free-kyc",
            description: tSolutions("cards.onboardCustomer.description"),
            cta: tCtas("learnMore"),
            iconSrc: "/icons/lifecycle/id-scan.svg",
            iconLabel: "User Verification (KYC)",
            moduleKey: "freeKyc",
            palette: "peach-soft"
          },
          {
            label: tSolutions("cards.verifyBusiness.title"),
            href: "/products/business-verification",
            description: tSolutions("cards.verifyBusiness.description"),
            cta: tCtas("learnMore"),
            iconSrc: "/icons/lifecycle/id-scan.svg",
            iconLabel: tNav("solutions.cards.verifyBusiness.iconLabel"),
            moduleKey: "businessVerification",
            palette: "blue-soft"
          },
          {
            label: tSolutions("cards.stopFraud.title"),
            href: "/products/transaction-monitoring",
            description: tSolutions("cards.stopFraud.description"),
            cta: tCtas("learnMore"),
            iconSrc: "/icons/lifecycle/monitoring.svg",
            iconLabel: "Stop fraud",
            moduleKey: "transactionMonitoring",
            palette: "sky-soft"
          },
          {
            label: tSolutions("cards.complyAml.title"),
            href: "/products/aml-screening",
            description: tSolutions("cards.complyAml.description"),
            cta: tCtas("learnMore"),
            iconSrc: "/icons/lifecycle/monitoring.svg",
            iconLabel: "Comply with AML",
            moduleKey: "amlScreening",
            palette: "blue-soft"
          }
        ],
        // Column order: Use cases (left) · By module (middle) · By
        // industry (right). Industries sits on the right per Alberto:
        // it's the secondary filter once a buyer has picked their job
        // or atomic API, so it earns the trailing slot. Reduced from 6
        // verticals to 4 + see-all so the column reads as a teaser into
        // /industries rather than an exhaustive list.
        columns: [
          {
            heading: tSolutions("byUseCase.heading"),
            // Ordered by ICP impact across Didit's four target verticals
            // (fintech / crypto / marketplaces / iGaming):
            //   1. Full KYC onboarding — flagship workflow ($0.33 bundle
            //      anchor), every ICP needs it.
            //   2. Age verification — iGaming + social + Brazil Lei Felca
            //      + EU AGE rule. Highest-volume regulated use case.
            //   3. Crypto on-ramp KYC + KYT — crypto ICP tier-1
            //      workflow (MiCA-aligned).
            //   4. Stop account takeovers — fintech tier-1 problem
            //      (neobanks + payments).
            //   5. Block multi-account abuse — marketplaces + iGaming
            //      duplicate-account defense.
            //   6. Proof of human — AI / agent surface, fastest-growing
            //      adjacent category.
            // Dropped from the navbar teaser: bot-detection (overlaps
            // proof-of-human), gig-worker-verification (narrower),
            // password-recovery (niche). `/solutions` see-all carries
            // the long tail.
            links: [
              {
                label: tSolutions("byUseCase.fullKycOnboarding"),
                href: "/solutions/full-kyc-onboarding"
              },
              {
                label: tSolutions("byUseCase.ageVerification"),
                href: "/solutions/age-verification"
              },
              {
                label: tSolutions("byUseCase.cryptoOnramp"),
                href: "/solutions/crypto-onramp-kyc-kyt"
              },
              {
                label: tSolutions("byUseCase.accountTakeover"),
                href: "/solutions/account-takeover"
              },
              {
                label: tSolutions("byUseCase.multiAccountAbuse"),
                href: "/solutions/multi-account-abuse"
              },
              {
                label: tSolutions("byUseCase.gigWorker"),
                href: "/solutions/gig-worker-verification"
              },
              { label: tSolutions("byUseCase.proofOfHuman"), href: "/solutions/proof-of-human" },
              {
                label: tSolutions("byUseCase.passwordRecovery"),
                href: "/solutions/password-recovery"
              },
              { label: tSolutions("byUseCase.seeAll"), href: "/solutions", accent: true }
            ]
          },
          {
            heading: tSolutions("byModule.heading"),
            // Ordered by buyer pull: Free KYC leads (the bundle anchor +
            // free tier is Didit's hook), then the three KYC-bundle
            // modules (ID, liveness, face match), then the
            // fraud / monitoring modules. AML Screening removed from
            // the navbar teaser — it's still in the catalogue under
            // /products/aml-screening + the All-modules see-all.
            // `Database validation` renders here as "Government
            // checks" (the buyer-facing noun for civil-registry
            // cross-checks); the underlying route + product page
            // names stay unchanged.
            // Curated 6-module teaser. Order chosen by Alberto:
            //   1. Free KYC — anchor of the free tier (intentionally
            //      duplicates the primary "User Verification (KYC)"
            //      card href above, so the buyer can land on the same
            //      destination from either the card row or the module
            //      column).
            //   2. Government checks — authoritative civil-registry
            //      lookups (the user-facing rename for Database
            //      Validation; underlying route + product page name
            //      stay `/products/database-validation`).
            //   3. Biometric Authentication — passwordless / step-up
            //      flow.
            //   4. Wallet Screening (KYT) — crypto on-chain wallet
            //      risk at $0.15 per check.
            //   5. Age Estimation — selfie-based age signal for
            //      iGaming, social, and age-gated commerce.
            //   6. Device & IP Analysis — fraud baseline that ships
            //      with every $0.33 bundle.
            // ID Verification / Liveness / Face Match / NFC Reading
            // / AML Screening dropped from the teaser. Still in the
            // catalogue + the All-modules see-all.
            links: [
              {
                label: tSolutions("byModule.freeKyc"),
                href: "/products/free-kyc",
                iconKey: "freeKyc"
              },
              {
                label: tSolutions("byModule.governmentChecks"),
                href: "/products/database-validation",
                iconKey: "databaseValidation"
              },
              {
                label: tSolutions("byModule.biometricAuthentication"),
                href: "/products/biometric-authentication",
                iconKey: "biometricAuth"
              },
              {
                label: tSolutions("byModule.walletScreening"),
                href: "/products/wallet-screening",
                iconKey: "walletScreening"
              },
              {
                label: tSolutions("byModule.ageEstimation"),
                href: "/products/age-estimation",
                iconKey: "ageEstimation"
              },
              {
                label: tSolutions("byModule.ipAnalysis"),
                href: "/products/device-ip-analysis",
                iconKey: "ipAnalysis"
              },
              {
                label: tSolutions("byModule.idVerification"),
                href: "/products/id-verification",
                iconKey: "idVerification"
              },
              {
                label: tSolutions("byModule.whiteLabel"),
                href: "/products/white-label",
                iconKey: "whiteLabel"
              },
              { label: tSolutions("byModule.seeAll"), href: "/products", accent: true }
            ]
          },
          {
            heading: tSolutions("byIndustry.heading"),
            // Prominent variant — verticals render in font-display
            // Inter 500 at 18px so the column reads as featured
            // categories, slightly bigger than the 14.5px font-medium
            // use-case + module links. Per Alberto: industries should
            // pop, not whisper.
            variant: "prominent",
            links: [
              {
                label: tSolutions("byIndustry.fintech"),
                description: tSolutions("byIndustry.fintechDesc"),
                href: "/industries/identity-verification-fintech",
                iconKey: "fintech"
              },
              {
                label: tSolutions("byIndustry.crypto"),
                description: tSolutions("byIndustry.cryptoDesc"),
                href: "/industries/identity-verification-crypto",
                iconKey: "crypto"
              },
              {
                label: tSolutions("byIndustry.igaming"),
                description: tSolutions("byIndustry.igamingDesc"),
                href: "/industries/identity-verification-igaming",
                iconKey: "igaming"
              },
              {
                label: tSolutions("byIndustry.marketplaces"),
                description: tSolutions("byIndustry.marketplacesDesc"),
                href: "/industries/identity-verification-marketplaces",
                iconKey: "marketplaces"
              },
              {
                label: tSolutions("byIndustry.mobility"),
                description: tSolutions("byIndustry.mobilityDesc"),
                href: "/industries/identity-verification-mobility",
                iconKey: "mobility"
              },
              { label: tSolutions("byIndustry.seeAll"), href: "/industries", accent: true }
            ]
          }
        ]
      }
    },
    {
      label: tNav("labels.developers"),
      dropdown: {
        // One big Quickstart card on the left, anchor of the dropdown.
        // Terminal variant: replaces the static gradient + icon with
        // a looping ASCII terminal that types `$ claude` and watches
        // a Claude Code agent integrate Didit. Reads as IS HAPPENING
        // NOW rather than as a static link — same intent as the
        // home-hero CodeTyper, transposed into the navbar slot.
        primaryCards: [
          {
            label: tDevs("primary.quickstart"),
            description: tDevs("quickstartCard.eyebrow"),
            cta: tDevs("quickstartCard.cta"),
            href: `${DOCS_BASE}/getting-started/quick-start`,
            external: true,
            // iconSrc + iconLabel + palette are unused in the terminal
            // variant but the type still requires them.
            iconSrc: "/icons/lifecycle/monitoring.svg",
            iconLabel: tNav("developers.primary.quickstartIconLabel"),
            palette: "blue",
            large: true,
            terminal: [
              { text: tNav("developers.primary.terminal.claude"), pause: 360 },
              { text: tNav("developers.primary.terminal.integrateDidit"), pause: 520 },
              { text: tNav("developers.primary.terminal.readingMcp"), pause: 280 },
              { text: tNav("developers.primary.terminal.mcpConnected"), pause: 240 },
              { text: tNav("developers.primary.terminal.sessionScaffolded"), pause: 240 },
              { text: tNav("developers.primary.terminal.webhookReady"), pause: 240 },
              { text: tNav("developers.primary.terminal.readyOpenDashboard"), pause: 1200 }
            ]
          }
        ],
        // Every link in the Developers dropdown points OFF the marketing
        // site to the technical surface (docs.didit.me, business sandbox,
        // status). Per Alberto's spec: developer surfaces should never
        // bounce the dev back into marketing.
        columns: [
          {
            heading: tDevs("buildLinks.heading"),
            links: [
              { label: tDevs("primary.docs"), href: DOCS_BASE, external: true },
              {
                label: tDevs("primary.apiReference"),
                href: `${DOCS_BASE}/api-reference`,
                external: true
              },
              {
                // MCP server -> the new /developers/mcp marketing landing page
                // (the one Developers-dropdown link that stays on-site).
                label: tDevs("primary.mcpServer"),
                href: "/developers/mcp"
              },
              {
                label: tDevs("buildLinks.sdks"),
                href: `${DOCS_BASE}/integration/web-sdks/overview`,
                external: true
              },
              {
                label: tDevs("buildLinks.webhooks"),
                href: `${DOCS_BASE}/integration/webhooks`,
                external: true
              }
            ]
          },
          {
            heading: tDevs("ship.heading"),
            links: [
              // Integration prompt -> /developers/coding-agent-integration
              // is the marketing landing for the Cursor / Claude Code
              // / Codex one-shot integration prompt. Surfaced first
              // under Ship because once a dev has the docs + the MCP
              // server pinned, the *next* thing they want is the
              // canned prompt that scaffolds a working integration.
              {
                label: tDevs("ship.integrationPrompt"),
                href: `${DOCS_BASE}/integration/integration-prompt`,
                external: true
              },
              { label: tDevs("ship.sandbox"), href: BUSINESS_BASE, external: true },
              {
                label: tDevs("buildLinks.agentSkills"),
                href: `${DOCS_BASE}/getting-started/agent-skills`,
                external: true
              },
              { label: tDevs("ship.changelog"), href: `${DOCS_BASE}/changelog`, external: true },
              { label: tDevs("ship.status"), href: "https://status.didit.me", external: true }
            ]
          }
        ]
      }
    },
    {
      label: tNav("labels.resources"),
      dropdown: {
        // Big "Meet the founders" hero card with the Alejandro + Alberto
        // portrait as the background image. Links to /about-us. Same
        // 280px-tall NavCard size as the Quickstart card in Developers.
        primaryCards: [
          {
            label: tResources("foundersCard.title"),
            description: tResources("foundersCard.description"),
            cta: tResources("foundersCard.cta"),
            href: "/about-us",
            imageSrc: "/media/founders/alejandro-alberto-card.jpg",
            imageAlt: tNav("resources.foundersCard.imageAlt"),
            // iconSrc + iconLabel + palette are unused in the
            // image-background variant but the type still requires them.
            iconSrc: "/icons/lifecycle/liveness.svg",
            iconLabel: tNav("resources.foundersCard.iconLabel"),
            palette: "blue",
            large: true
          }
        ],
        columns: [
          {
            heading: tResources("read.heading"),
            links: [
              { label: tResources("hero.academy"), href: "/academy" },
              { label: tResources("hero.blog"), href: "/blog" },
              { label: tResources("hero.successStories"), href: "/success-stories" },
              {
                // Help Center — plain-language customer answers on
                // help.didit.me. The help centre vendors this exact navbar
                // (fe-didit-help-center syncs + byte-checks it in CI), so
                // the link shows up on both sites from this one entry.
                label: tResources("hero.helpCenter"),
                href: "https://help.didit.me",
                external: true
              },
              {
                label: tResources("hero.demoCenter"),
                href: "https://demos.didit.me",
                external: true
              }
            ]
          },
          {
            heading: tResources("company.heading"),
            links: [
              { label: tResources("company.about"), href: "/about-us" },
              // Careers opens the Personio jobs board in a new tab.
              {
                label: tResources("company.careers"),
                href: "https://didit.jobs.personio.com/",
                external: true
              },
              { label: tResources("company.securityCompliance"), href: "/security-compliance" },
              // /contact 301-redirects to /get-a-demo (2026-05-13).
              { label: tResources("company.contact"), href: "/get-a-demo" }
            ]
          }
        ]
      }
    },
    { label: tNav("pricing"), href: "/pricing" }
  ];

  return (
    <UiNavbar
      data-didit-component="navbar"
      sticky
      ctaSize="default"
      brand={
        // Right-click the wordmark to grab brand assets (copy / download logo
        // + Didit Blue, jump to /brand) — like orangecollective.vc. Left-click
        // still navigates home via the navbar's wrapping <Link>.
        <LogoContextMenu
          logoAlt={tNav("image.alt.didit")}
          width={88}
          height={32}
          className="h-7 w-auto"
        />
      }
      brandHref="/"
      items={items}
      secondaryCta={{
        // CTA swap 2026-05-14: "Sign up" now occupies the soft / ghost
        // slot — self-serve is the secondary path. The solid primary
        // pill goes to "Talk to us" → /get-a-demo so sales-led buyers
        // see the highest-affordance button.
        label: tCtas("signUp"),
        href: `${BUSINESS_BASE}?utm_source=navbar`,
        external: true
      }}
      // Search sits attached to the nav-link group (next to Pricing); the
      // language switcher stays with the CTA cluster on the right.
      navExtra={<SiteSearch />}
      rightExtra={<LocaleSwitcher />}
      mobileExtra={
        // Mobile drawer: full-width list-item shape (globe + language
        // name on a soft grey pill), popover matches the trigger's
        // width and caps at 60vh, opens UP from above the trigger
        // since it sits at the drawer's bottom edge.
        <LocaleSwitcher fullWidth side="top" align="start" />
      }
      primaryCta={{
        // CTA swap 2026-05-14: primary slot now reads "Talk to us" → the
        // sales conversation. Enterprise buyers are the wedge in the
        // current funnel; the self-serve sandbox stays one click away
        // via the secondary slot.
        label: tCtas("talkToUs"),
        href: "/get-a-demo"
      }}
    />
  );
}
