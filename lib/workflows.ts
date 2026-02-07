import type { LucideIcon } from "lucide-react";

import {
  IdCard,
  ShieldCheck,
  UserRoundCheck,
  Fingerprint,
  Smartphone,
  Gauge,
  Home,
  Globe,
  Building2,
  Gamepad2,
  ShoppingBag,
  Wallet,
  Lock,
  Users,
  MessageSquare,
} from "lucide-react";

export type WorkflowConfig = {
  id: string;
  title: string;
  shortTitle: string;
  icon: LucideIcon;
  description: string;
  longDescription: string;
  steps: { title: string; description: string }[];
  bestFor: string;
  useCases: { icon: LucideIcon; label: string }[];
  features: string[];
  stats?: { value: string; label: string }[];
  badge?: string;
  badgeColor?: "blue" | "green" | "purple" | "orange";
  requiresPortrait?: boolean;
  isCaptcha?: boolean;
};

const isStaging = process.env.NEXT_PUBLIC_IS_STAGING === "true";

export const WORKFLOWS: WorkflowConfig[] = [
  {
    id: isStaging
      ? "2db28cd2-7713-405f-89ad-144613b7086e"
      : "7c1e467d-fe91-4ade-aa72-ec022fc67971",
    title: "Core KYC (Free)",
    shortTitle: "Core KYC",
    icon: IdCard,
    badge: "Free KYC",
    badgeColor: "green",
    description: "Standard user onboarding for any industry.",
    longDescription:
      "This is our foundational onboarding flow and the core of our 'Free KYC' plan. It's designed for businesses that need a fast, secure, and compliant way to verify new users without any friction or cost for the essential checks.",
    steps: [
      {
        title: "Scan an ID Document",
        description:
          "User captures their government-issued ID using their device camera. Our AI extracts and validates all document data.",
      },
      {
        title: "Take a Quick Selfie",
        description:
          "A passive liveness check confirms the user is real—no awkward movements required. Takes under 2 seconds.",
      },
      {
        title: "Get Verified in Seconds",
        description:
          "Our AI matches the selfie to the ID photo and returns a decision in real-time. You're ready to onboard.",
      },
    ],
    bestFor: "Standard user onboarding for any industry.",
    useCases: [
      { icon: Building2, label: "Fintech" },
      { icon: ShoppingBag, label: "E-commerce" },
      { icon: Users, label: "Marketplaces" },
      { icon: Globe, label: "SaaS Platforms" },
    ],
    features: [
      "ID Verification",
      "Passive Liveness",
      "Face Match 1:1",
      "IP Analysis",
    ],
    stats: [
      { value: "220+", label: "Countries Supported" },
      { value: "<10s", label: "Avg. Verification Time" },
      { value: "Free", label: "Core Plan" },
    ],
  },
  {
    id: isStaging
      ? "c076a8bb-b0a1-482a-a257-c296391fac2f"
      : "8c0f1388-39fd-48e3-904f-6efb3d372376",
    title: "Enhanced Compliance (KYC + AML)",
    shortTitle: "KYC + AML",
    icon: ShieldCheck,
    badge: "Regulated Industries",
    badgeColor: "purple",
    description: "Fintech, Banking, and Crypto Exchanges.",
    longDescription:
      "This workflow is built for regulated industries that require the highest level of assurance. It combines our robust KYC process with higher-security Active Liveness and real-time Anti-Money Laundering (AML) screening to ensure full compliance.",
    steps: [
      {
        title: "Scan an ID Document",
        description:
          "Capture and validate government-issued ID with AI-powered document verification and fraud detection.",
      },
      {
        title: "Perform a Simple Action",
        description:
          "Active liveness requires a specific movement (like blinking or turning head) to ensure the person is physically present.",
      },
      {
        title: "Automated AML Check",
        description:
          "We screen against global sanctions lists, PEP databases, and adverse media in real-time—all in the background.",
      },
    ],
    bestFor: "Fintech, Banking, and Crypto Exchanges.",
    useCases: [
      { icon: Wallet, label: "Crypto Exchanges" },
      { icon: Building2, label: "Banking" },
      { icon: ShieldCheck, label: "Fintech" },
      { icon: Globe, label: "Cross-border Payments" },
    ],
    features: [
      "ID Verification",
      "Active Liveness",
      "Face Match 1:1",
      "AML Screening",
      "IP Analysis",
    ],
    stats: [
      { value: "1000+", label: "Sanction Lists" },
      { value: "99.9%", label: "Accuracy Rate" },
      { value: "Real-time", label: "Screening" },
    ],
  },
  {
    id: isStaging
      ? "8aa86809-5156-4a73-8b09-cb3d6f882d27"
      : "b5d5523f-bd45-4aa3-9ec5-0490172a22c1",
    title: "Liveness Check Only",
    shortTitle: "Liveness",
    icon: UserRoundCheck,
    badge: "Quick Verification",
    badgeColor: "blue",
    description: "Securing password resets or high-risk transactions.",
    longDescription:
      "This workflow is designed to confirm that a real, live person is performing a specific action, without needing to verify their identity against a document. It's a powerful tool to prevent bot activity and secure key user interactions.",
    steps: [
      {
        title: "Take a Selfie",
        description:
          "User captures a quick selfie using their device camera. Works on any modern browser or mobile device.",
      },
      {
        title: "Follow On-Screen Instructions",
        description:
          "Active liveness prompts ensure a real person is present—detecting sophisticated attacks like deepfakes and injection attacks.",
      },
    ],
    bestFor: "Securing password resets or high-risk transactions.",
    useCases: [
      { icon: Lock, label: "Password Resets" },
      { icon: Wallet, label: "High-Risk Transactions" },
      { icon: Users, label: "Account Recovery" },
      { icon: ShieldCheck, label: "Step-Up Auth" },
    ],
    features: ["Active Liveness", "Passive Liveness", "IP Analysis"],
    stats: [
      { value: "2s", label: "Check Duration" },
      { value: "99.8%", label: "Spoof Detection" },
      { value: "SDK + Web", label: "Integration" },
    ],
  },
  {
    id: isStaging
      ? "9b610989-c77e-48ad-9c27-0668c6edd2be"
      : "d1972e27-eeb8-4543-918b-6ac0846b7cc5",
    title: "Biometric Authentication",
    shortTitle: "Face Auth",
    icon: Fingerprint,
    badge: "Passwordless",
    badgeColor: "orange",
    description: "Passwordless login and securing existing user accounts.",
    longDescription:
      "Experience a fast, secure, and passwordless way to re-verify returning users. This flow biometrically matches a new live selfie against the trusted photo from the user's initial, approved KYC verification, preventing account takeover fraud.",
    steps: [
      {
        title: "Take a New Selfie",
        description:
          "User captures a fresh selfie. Our AI performs liveness detection to ensure they're physically present.",
      },
      {
        title: "Get Authenticated in Seconds",
        description:
          "We match the new selfie against their verified identity photo. Instant, secure, passwordless access.",
      },
    ],
    bestFor: "Passwordless login and securing existing user accounts.",
    useCases: [
      { icon: Lock, label: "Passwordless Login" },
      { icon: Wallet, label: "Transaction Auth" },
      { icon: Users, label: "Account Security" },
      { icon: Smartphone, label: "Mobile Apps" },
    ],
    features: ["Liveness Check", "Face Match 1:1", "IP Analysis"],
    stats: [
      { value: "<1s", label: "Auth Time" },
      { value: "Biometric", label: "Auth" },
      { value: "Zero", label: "Passwords" },
    ],
    requiresPortrait: true,
  },
  {
    id: isStaging
      ? "e4cecdd1-fb1d-4992-8fba-4175aaa2ba76"
      : "dbdb51a9-3763-4dcf-a32d-8fe5f40a699d",
    title: "Multi-Factor Verification",
    shortTitle: "MFA",
    icon: Smartphone,
    badge: "Enhanced Security",
    badgeColor: "purple",
    description: "Preventing fake accounts and adding a second factor.",
    longDescription:
      "This workflow adds an extra layer of security by linking a biometric check to a verified communication channel. It ensures that a real, live person is also in possession of a specific phone number.",
    steps: [
      {
        title: "Take a Selfie (Liveness Check)",
        description:
          "Confirm the user is a real person with our AI-powered liveness detection.",
      },
      {
        title: "Enter Phone Number",
        description:
          "User provides their phone number to receive a one-time verification code.",
      },
      {
        title: "Validate OTP Code",
        description:
          "Enter the code to prove possession of the phone. Biometrics + phone = verified identity.",
      },
    ],
    bestFor: "Preventing fake accounts and adding a second factor.",
    useCases: [
      { icon: Users, label: "Account Creation" },
      { icon: MessageSquare, label: "Social Platforms" },
      { icon: ShoppingBag, label: "Marketplaces" },
      { icon: Lock, label: "Sensitive Actions" },
    ],
    features: ["Liveness Check", "Phone Verification", "IP Analysis"],
    stats: [
      { value: "2-Factor", label: "Authentication" },
      { value: "SMS/Voice", label: "OTP Delivery" },
      { value: "Global", label: "Coverage" },
    ],
  },
  {
    id: isStaging
      ? "8482aee5-38b8-46fd-914b-e1bc6edcadca"
      : "0aa1d022-c1ee-47b0-8538-5c8c32515739",
    title: "Adaptive Age Verification",
    shortTitle: "Age Check",
    icon: Gauge,
    badge: "Smart Compliance",
    badgeColor: "blue",
    description: "Social Media, iGaming, and age-restricted E-commerce.",
    longDescription:
      "This is the smartest way to handle age-gated content and comply with new regulations. It provides a low-friction, privacy-first age check for most users, with a seamless fallback to a full ID check only when necessary. (In this example, a full ID check is triggered if the estimated age is between 15 and 25 years old.)",
    steps: [
      {
        title: "Take a Selfie (AI Estimates Age)",
        description:
          "Our AI analyzes the selfie to estimate the user's age. Most users pass instantly with zero friction.",
      },
      {
        title: "Conditional ID Check",
        description:
          "Only if the age falls in a 'buffer zone' (e.g., 15-25), we request an ID scan for verification.",
      },
    ],
    bestFor: "Social Media, iGaming, and age-restricted E-commerce.",
    useCases: [
      { icon: Gamepad2, label: "iGaming" },
      { icon: MessageSquare, label: "Social Media" },
      { icon: ShoppingBag, label: "E-commerce" },
      { icon: Globe, label: "Streaming" },
    ],
    features: [
      "Age Estimation",
      "Liveness Check",
      "ID Verification",
      "IP Analysis",
    ],
    stats: [
      { value: "90%+", label: "Pass Rate (no ID)" },
      { value: "Adaptive", label: "Logic" },
      { value: "GDPR", label: "Compliant" },
    ],
  },
  {
    id: isStaging
      ? "016aa374-1672-4f57-a227-3fa750a6977c"
      : "94f9c776-4362-488e-93ff-9dd2921af3f2",
    title: "Proof of Address (PoA)",
    shortTitle: "PoA",
    icon: Home,
    badge: "Due Diligence",
    badgeColor: "purple",
    description: "Enhanced due diligence in Banking and Fintech.",
    longDescription:
      "This workflow is designed for enhanced due diligence, allowing you to verify a user's residential address. It's a critical step for high-level financial compliance and risk management.",
    steps: [
      {
        title: "Capture Address Document",
        description:
          "User uploads or photographs a proof of address document like a utility bill, bank statement, or government letter.",
      },
      {
        title: "Automated AI Analysis",
        description:
          "Our AI extracts the address, validates the document type, and checks for signs of tampering or fraud.",
      },
    ],
    bestFor: "Enhanced due diligence in Banking and Fintech.",
    useCases: [
      { icon: Building2, label: "Banking" },
      { icon: Wallet, label: "Fintech" },
      { icon: Globe, label: "Cross-border" },
      { icon: ShieldCheck, label: "Compliance" },
    ],
    features: ["Proof of Address", "IP Analysis"],
    stats: [
      { value: "50+", label: "Document Types" },
      { value: "AI", label: "Fraud Detection" },
      { value: "EDD", label: "Ready" },
    ],
  },
];
