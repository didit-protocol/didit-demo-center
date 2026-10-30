import type { MetadataRoute } from "next";

import { PRODUCTION_URL, siteConfig } from "../config/site";
import { PRIVATE_PATHS } from "../lib/seo";

/**
 * demos.didit.me is open to every crawler, search and AI alike, so the demos
 * can be found and cited. Staging is never crawled, so it can never compete
 * with production.
 */
export default function robots(): MetadataRoute.Robots {
  if (siteConfig.url !== PRODUCTION_URL) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: `${PRODUCTION_URL}/sitemap.xml`,
  };
}
