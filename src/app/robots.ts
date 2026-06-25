import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The authenticated app and API/webhooks should not be crawled.
        disallow: ["/app", "/api", "/onboarding"],
      },
    ],
    sitemap: `${env.app.url}/sitemap.xml`,
  };
}
