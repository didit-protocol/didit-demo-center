export type SiteConfig = typeof siteConfig;

const isStaging = process.env.NEXT_PUBLIC_IS_STAGING === "true";

export const siteConfig = {
  name: "Didit Demo Center",
  description:
    "Every Didit module, live. Run 18 pre-built workflows across KYC, KYB, monitoring and fraud - launch a real hosted session or click through a sample decision, with the request that created it.",
  url: isStaging ? "https://demos.staging.didit.me" : "https://demos.didit.me",
  links: {
    console: isStaging
      ? "https://business.staging.didit.me"
      : "https://business.didit.me",
    docs: "https://docs.didit.me",
    website: "https://didit.me",
    github: "https://github.com/didit-protocol/didit-demo-center",
    twitter: "https://x.com/Diditprotocol",
  },
};
