import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: APP_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${APP_URL}/share`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${APP_URL}/roast`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${APP_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: `${APP_URL}/terms`, lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];
}
