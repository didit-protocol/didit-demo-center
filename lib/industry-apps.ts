/**
 * Industry apps: whole products built on Didit, one per industry, each on its
 * own route. Unlike the catalogue's single-module demos, an app runs several
 * modules end to end the way a customer in that industry would.
 */
export interface IndustryApp {
  href: string;
  icon: string;
  industry: string;
  name: string;
  summary: string;
  modules: string[];
}

export const INDUSTRY_APPS: IndustryApp[] = [
  {
    href: "/crypto-exchange",
    icon: "/icons/industries/crypto.svg",
    industry: "Crypto exchange",
    name: "Kestrel",
    summary:
      "KYC and AML at sign-up, wallet screening on every deposit and withdrawal, the Travel Rule and a selfie step-up, with the compliance view of each transfer.",
    modules: [
      "KYC + AML",
      "Wallet screening",
      "Travel Rule",
      "Biometric step-up",
    ],
  },
];
