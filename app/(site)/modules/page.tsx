import { redirect } from "next/navigation";

import { Catalogue } from "@/components/demo-center/catalogue";
import { routeForLegacy } from "@/lib/product-demos/demos";

/**
 * The old module catalogue. Every module now has its own product demo page:
 * `/modules?demo=<id>` opens it and `/modules` the hub's grid. Only the hosted
 * flow's return (`?verificationSessionId=`, from /verification/callback for
 * /accs, /ibeta and older sessions) still opens the catalogue's results.
 */
export default async function Modules({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  if (params.verificationSessionId) return <Catalogue />;
  const demo = typeof params.demo === "string" ? params.demo : null;

  redirect(routeForLegacy(demo) ?? "/#product-demos");
}
