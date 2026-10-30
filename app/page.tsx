import { Metadata } from "next";
import { permanentRedirect, redirect } from "next/navigation";

import "@/styles/demos/live.css";
import "@/styles/demos/hub.css";
import "@/styles/demos/product-demos.css";

import { Hub } from "@/components/hub/hub";
import { routeForLegacy } from "@/lib/product-demos/demos";

export const metadata: Metadata = {
  title: {
    absolute: "Didit Demo Center: four real products, Didit inside each one",
  },
  description:
    "A casino, a bank, a marketplace and a crypto exchange running Didit end to end: sign-up, verification, transactions and fraud, live on the sandbox.",
  alternates: { canonical: "/" },
};

/**
 * demos.didit.me. A link to a single module (`/?demo=<id>`, from didit.me)
 * opens its product demo page; the old catalogue's hosted flow return
 * (`/?verificationSessionId=`) still goes to /modules.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const product =
    typeof params.demo === "string" && !params.verificationSessionId
      ? routeForLegacy(params.demo)
      : null;

  // The module moved for good, so the link equity of `/?demo=<id>` moves with it.
  if (product) permanentRedirect(product);

  if (params.demo || params.verificationSessionId) {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") query.set(key, value);
    }
    redirect(`/modules?${query}`);
  }

  return <Hub />;
}
