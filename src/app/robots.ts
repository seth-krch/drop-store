import type { MetadataRoute } from "next";
import { SITE } from "@/lib/format";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/account", "/bag", "/checkout", "/api/", "/search"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
