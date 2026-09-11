"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { readCookieConsent } from "@/components/site/cookie-banner";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Loads GA4 only when configured AND the visitor accepted analytics cookies. */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = () => setAllowed(readCookieConsent().categories.analytics);
    check();
    window.addEventListener("fw-consent-changed", check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener("fw-consent-changed", check);
      window.removeEventListener("storage", check);
    };
  }, []);

  useEffect(() => {
    if (!measurementId || !allowed) return;
    const query = searchParams.toString();
    const pagePath = `${pathname}${query ? `?${query}` : ""}`;

    window.gtag?.("config", measurementId, { page_path: pagePath });
  }, [pathname, searchParams, allowed]);

  if (!measurementId || !allowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
