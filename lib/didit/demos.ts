/**
 * The four industry demos, one `defineDemo` each: brand, workflows per
 * environment (`pick(production, staging)`), the rules each one enforces and
 * its copy. The hub, the Demo Center bar and each demo's routes read them from
 * here; each demo's setup script still installs its own rules and lists.
 *
 * No `@/` imports: the setup scripts load the policies that read this file
 * straight from Node.
 */

import { defineDemo, pick } from "./config.ts";

/** Workflows shared by more than one demo. */
const AGE_ESTIMATION = pick(
  "0aa1d022-c1ee-47b0-8538-5c8c32515739",
  "8482aee5-38b8-46fd-914b-e1bc6edcadca",
);
const CORE_KYC = pick(
  "7c1e467d-fe91-4ade-aa72-ec022fc67971",
  "2db28cd2-7713-405f-89ad-144613b7086e",
);

export const auroraPlay = defineDemo({
  id: "aurora-play",
  route: "/igaming",
  industry: "iGaming",
  brand: {
    name: "Aurora Play",
    initial: "A",
    mark: "linear-gradient(135deg, #8B5CFF 0%, #E047C8 100%)",
  },
  vendorPrefix: "aurora-play-",
  workflows: { age: AGE_ESTIMATION, kyc: CORE_KYC },
  rules: {
    ageBeforeBet: "No bet before an approved age check",
    idAt2000: "ID check once deposits reach 2,000 EUR in 30 days",
    bonusPerDevice: "One welcome bonus per device",
  },
  copy: {
    tagline: "Casino and sportsbook",
    story:
      "A passkey sign-up, an age check before the first bet, deposits held for an ID check at 2,000 EUR, and bonus abuse caught by the device.",
  },
});

export const alder = defineDemo({
  id: "alder",
  route: "/fintech",
  industry: "Fintech",
  brand: { name: "Alder", initial: "A", mark: "#0F3D2E" },
  vendorPrefix: "alder-",
  workflows: {
    onboarding: pick(
      "205ef0c6-8efd-49a2-b99e-af9d5d5ecb23",
      "c076a8bb-b0a1-482a-a257-c296391fac2f",
    ),
  },
  rules: {
    newPayee: "Large transfers to a new payee need a passkey",
  },
  copy: {
    tagline: "A neobank",
    story:
      "An account in five minutes with KYC and AML, a 5,000 EUR transfer confirmed with a passkey, and an account takeover blocked at sign-in.",
  },
});

export const northmarket = defineDemo({
  id: "northmarket",
  route: "/marketplace",
  industry: "Marketplace",
  brand: { name: "Northmarket", initial: "N", mark: "#F06A1D" },
  vendorPrefix: "northmarket-",
  workflows: {
    // Staging keeps the workflow the setup script prints, from the environment.
    sellerKyb: pick(
      "811d80dd-491e-4799-b905-2c8007c9df78",
      (process.env.NEXT_PUBLIC_DIDIT_KYB_WORKFLOW_ID || "").trim(),
    ),
    buyerAge: AGE_ESTIMATION,
    person: CORE_KYC,
  },
  rules: {
    kybBeforePayout: "Sellers pass KYB before their first payout",
    ageAt1000: "Orders over 1,000 EUR wait for a buyer age check",
  },
  copy: {
    tagline: "Vintage and design resale",
    story:
      "Sellers pass KYB before their first payout, large orders wait for a quick age check, and a second shop on the same device is paused.",
  },
});

export const kestrel = defineDemo({
  id: "kestrel",
  route: "/crypto-exchange",
  industry: "Crypto exchange",
  brand: { name: "Kestrel", initial: "K", mark: "#14B8A6" },
  vendorPrefix: "kestrel-",
  workflows: {
    onboarding: pick(
      "2d743b26-c3ae-454b-9e86-072f52a09629",
      "c076a8bb-b0a1-482a-a257-c296391fac2f",
    ),
    stepUp: pick(
      "d1972e27-eeb8-4543-918b-6ac0846b7cc5",
      "9b610989-c77e-48ad-9c27-0668c6edd2be",
    ),
  },
  rules: {
    walletScreening: "Every deposit screened by the sending wallet",
    travelRule: "Travel Rule withdrawals confirmed with a selfie",
  },
  copy: {
    tagline: "Buy, hold and send crypto",
    story:
      "KYC and AML before the first deposit, deposits screened by wallet, a Travel Rule withdrawal with a selfie, and a sanctioned wallet declined.",
  },
});

export const DEMOS = [auroraPlay, alder, northmarket, kestrel];
