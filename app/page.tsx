import { Metadata } from "next";
import { redirect } from "next/navigation";

import "@/styles/demos/live.css";
import "@/styles/demos/hub.css";

import { Hub } from "@/components/hub/hub";

export const metadata: Metadata = {
  title: {
    absolute: "Didit Demo Center: four real products, Didit inside each one",
  },
  description:
    "A casino, a bank, a marketplace and a crypto exchange running Didit end to end: sign-up, verification, transactions and fraud, live on the sandbox.",
};

/**
 * demos.didit.me. Links to a single module (`/?demo=<id>`, from didit.me) and
 * the hosted flow's return (`/?verificationSessionId=`) belong to the module
 * catalogue, which lives at /modules.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  if (params.demo || params.verificationSessionId) {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") query.set(key, value);
    }
    redirect(`/modules?${query}`);
  }

  return <Hub />;
}
