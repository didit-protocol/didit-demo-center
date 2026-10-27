import { Metadata } from "next";

import "@/styles/igaming.css";

import { IgamingDemo } from "@/components/igaming/igaming-demo";

export const metadata: Metadata = {
  title: "iGaming demo: Aurora Play",
  description:
    "A fictional casino and sportsbook running Didit end to end: age estimation at sign-up, licensed-market checks, monitored deposits and withdrawals, an ID step-up, bonus-abuse detection and self-exclusion.",
  alternates: { canonical: "/igaming" },
};

export default function IgamingPage() {
  return <IgamingDemo />;
}
