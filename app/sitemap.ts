import type { MetadataRoute } from "next";

import { siteConfig } from "../config/site";
import { indexablePaths } from "../lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexablePaths().map((path) => ({
    url: new URL(path, siteConfig.url).toString(),
  }));
}
