import type { LucideIcon } from "lucide-react";

import {
  IdCard,
  ShieldCheck,
  UserRoundCheck,
  Fingerprint,
  Smartphone,
  Gauge,
  Home,
} from "lucide-react";
export type WorkflowConfig = {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  steps: string[];
  bestFor: string;
  features: string[];
  requiresPortrait?: boolean;
};

const isStaging = process.env.NEXT_PUBLIC_IS_STAGING === "true";

export const WORKFLOWS: WorkflowConfig[] = [
  {
    id: isStaging
      ? "2db28cd2-7713-405f-89ad-144613b7086e"
      : "7c1e467d-fe91-4ade-aa72-ec022fc67971",
    title: "Core KYC (Free)",
    icon: IdCard,
    description:
      "This is our foundational onboarding flow and the core of our 'Free Forever' plan. It’s designed for businesses that need a fast, secure, and compliant way to verify new users without any friction or cost for the essential checks.",
    steps: [
      "Scan an ID Document",
      "Take a Quick Selfie (Passive Liveness Check)",
      "Get Verified in Seconds",
    ],
    bestFor: "Standard user onboarding for any industry.",
    features: [
      "ID Verification",
      "Passive Liveness",
      "Face Match 1:1",
      "IP Analysis",
    ],
  },
  {
    id: isStaging
      ? "c076a8bb-b0a1-482a-a257-c296391fac2f"
      : "8c0f1388-39fd-48e3-904f-6efb3d372376",
    title: "Enhanced Compliance (KYC + AML)",
    icon: ShieldCheck,
    description:
      "This workflow is built for regulated industries that require the highest level of assurance. It combines our robust KYC process with higher-security Active Liveness and real-time Anti-Money Laundering (AML) screening to ensure full compliance.",
    steps: [
      "Scan an ID Document",
      "Perform a Simple Action (Active Liveness)",
      "Automated AML Check in the background",
    ],
    bestFor: "Fintech, Banking, and Crypto Exchanges.",
    features: [
      "ID Verification",
      "Active Liveness",
      "Face Match 1:1",
      "AML Screening",
      "IP Analysis",
    ],
  },
  {
    id: isStaging
      ? "8aa86809-5156-4a73-8b09-cb3d6f882d27"
      : "b5d5523f-bd45-4aa3-9ec5-0490172a22c1",
    title: "Liveness Check Only",
    icon: UserRoundCheck,
    description:
      "This workflow is designed to confirm that a real, live person is performing a specific action, without needing to verify their identity against a document. It's a powerful tool to prevent bot activity and secure key user interactions.",
    steps: ["Take a Selfie", "Follow On-Screen Instructions"],
    bestFor: "Securing password resets or high-risk transactions.",
    features: ["Active Liveness", "Passive Liveness", "IP Analysis"],
  },
  {
    id: isStaging
      ? "9b610989-c77e-48ad-9c27-0668c6edd2be"
      : "d1972e27-eeb8-4543-918b-6ac0846b7cc5",
    title: "Biometric Authentication",
    icon: Fingerprint,
    description:
      "Experience a fast, secure, and passwordless way to re-verify returning users. This flow biometrically matches a new live selfie against the trusted photo from the user's initial, approved KYC verification, preventing account takeover fraud.",
    steps: ["Take a New Selfie", "Get Authenticated in Seconds"],
    bestFor: "Passwordless login and securing existing user accounts.",
    features: ["Liveness Check", "Face Match 1:1", "IP Analysis"],
    requiresPortrait: true,
  },
  {
    id: isStaging
      ? "e4cecdd1-fb1d-4992-8fba-4175aaa2ba76"
      : "dbdb51a9-3763-4dcf-a32d-8fe5f40a699d",
    title: "Multi-Factor Verification",
    icon: Smartphone,
    description:
      "This workflow adds an extra layer of security by linking a biometric check to a verified communication channel. It ensures that a real, live person is also in possession of a specific phone number.",
    steps: [
      "Take a Selfie (Liveness Check)",
      "Enter Phone Number",
      "Validate OTP Code",
    ],
    bestFor: "Preventing fake accounts and adding a second factor.",
    features: ["Liveness Check", "Phone Verification", "IP Analysis"],
  },
  {
    id: isStaging
      ? "8482aee5-38b8-46fd-914b-e1bc6edcadca"
      : "0aa1d022-c1ee-47b0-8538-5c8c32515739",
    title: "Adaptive Age Verification",
    icon: Gauge,
    description:
      "This is the smartest way to handle age-gated content and comply with new regulations. It provides a low-friction, privacy-first age check for most users, with a seamless fallback to a full ID check only when necessary. (In this example, a full ID check is triggered if the estimated age is between 15 and 25 years old.)",
    steps: [
      "Take a Selfie (AI estimates age)",
      "Conditional: Scan ID if age is in a 'buffer zone'",
    ],
    bestFor: "Social Media, iGaming, and age-restricted E-commerce.",
    features: [
      "Age Estimation",
      "Liveness Check",
      "ID Verification",
      "IP Analysis",
    ],
  },
  {
    id: isStaging
      ? "8482aee5-38b8-46fd-914b-e1bc6edcadca"
      : "94f9c776-4362-488e-93ff-9dd2921af3f2",
    title: "Proof of Address (PoA)",
    icon: Home,
    description:
      "This workflow is designed for enhanced due diligence, allowing you to verify a user's residential address. It's a critical step for high-level financial compliance and risk management.",
    steps: [
      "Capture Address Document (e.g., utility bill)",
      "Automated AI Analysis and Verification",
    ],
    bestFor: "Enhanced due diligence in Banking and Fintech.",
    features: ["Proof of Address", "IP Analysis"],
  },
];
