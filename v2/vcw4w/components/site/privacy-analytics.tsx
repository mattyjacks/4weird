"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

const PRIVATE_ANALYTICS_PATHS = [
  "/api", "/my", "/family", "/vocrehab", "/vault", "/orgs", "/projects",
  "/feedback", "/agents", "/clans", "/crm", "/messages", "/friends",
  "/support", "/checkout", "/coins", "/mmo", "/presence", "/settings",
  "/account", "/auth", "/bot", "/social", "/parties", "/love", "/admin",
  "/profile", "/profiles", "/user", "/users",
];

function redactAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const parsed = new URL(event.url, "https://4weird.com");
    if (PRIVATE_ANALYTICS_PATHS.some((prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`))) return null;
    return { ...event, url: `${parsed.origin}${parsed.pathname}` };
  } catch {
    return null;
  }
}

export function PrivacyAnalytics() {
  return <Analytics beforeSend={redactAnalyticsEvent} />;
}
