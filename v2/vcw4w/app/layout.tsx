import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { SiteThemeProvider } from "@/components/site/site-theme-provider";
import { COLOR_THEME_IDS, DEFAULT_COLOR_THEME, SITE_COLOR_STORAGE_KEY } from "@/lib/site-theme";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@/components/site/google-analytics";
import { CookieBanner } from "@/components/site/cookie-banner";
import { DailyBonusBanner } from "@/components/site/daily-bonus-banner";
import { CachedSiteFooter } from "@/components/site/site-footer-cached";
import { SiteHeader } from "@/components/site/site-header";
import { MenuSidebar } from "@/components/site/menu-sidebar";
import { FeedbackBar } from "@/components/feedback/feedback-bar";
import { A11yProvider } from "@/components/site/a11y-provider";
import { UsaFireworksLazy } from "@/components/site/themes/usa-fireworks-lazy";
import { GreenGuyCamoLazy } from "@/components/site/themes/green-guy-camo-lazy";
import { ColorblindFilters } from "@/components/a11y/colorblind-filters";
import { EyeDwellLazy } from "@/components/a11y/eye-dwell-lazy";
import { SwitchScanLazy } from "@/components/a11y/switch-scan-lazy";
import { PerfBootstrap } from "@/components/perf/perf-bootstrap";
import {
  CORE_KEYWORDS,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  OPERATOR,
  SITE_LANGUAGE,
  SITE_NAME,
  SITE_URL,
  canonical,
  jsonLdScript,
  organizationJsonLd,
} from "@/lib/seo";
import "./globals.css";
// Site color themes: one file per palette + the shared accent remap.
// Order matters (later wins on equal specificity): identity first, remap last.
import "./theme-css/blue-boy.css";
import "./theme-css/girly-girl.css";
import "./theme-css/trans-them.css";
import "./theme-css/green-guy.css";
import "./theme-css/usa.css";
import "./theme-css/remap-shared.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | 4weird Games",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [...CORE_KEYWORDS],
  authors: [{ name: OPERATOR, url: SITE_URL }],
  creator: OPERATOR,
  publisher: OPERATOR,
  category: "games",
  alternates: {
    canonical: canonical("/"),
  },
  openGraph: {
    type: "website",
    locale: SITE_LANGUAGE,
    url: canonical("/"),
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/og/og-home.png",
        width: 1200,
        height: 630,
        alt: "4weird Games - Future Forward Fun, Funded by Founders",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/og/og-home.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/vcw/vcw-logo.png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#8b5cf6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }}
        />
        {/* Stamp the last-selected color theme before first paint (no flash).
            next-themes handles light/dark separately; this handles the palette. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var ids=${JSON.stringify(COLOR_THEME_IDS)};var v=localStorage.getItem(${JSON.stringify(SITE_COLOR_STORAGE_KEY)});if(ids.indexOf(v)===-1)v=${JSON.stringify(DEFAULT_COLOR_THEME)};document.documentElement.classList.add(v);document.documentElement.dataset.siteColor=v;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <SiteThemeProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          themes={["light", "dark"]}
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            {/* usePathname() chrome streams after the PPR shell prerenders:
                without Suspense every dynamic route fails prerender with
                CLIENT_HOOK_DYNAMIC. Fallbacks are static shells (no hooks). */}
            <Suspense fallback={null}>
              <DailyBonusBanner />
            </Suspense>
            <Suspense fallback={null}>
              <FeedbackBar />
            </Suspense>
            <Suspense
              fallback={
                <header aria-hidden="true" className="border-b py-4" />
              }
            >
              <SiteHeader />
            </Suspense>
            <Suspense fallback={null}>
              <MenuSidebar />
            </Suspense>
            <div id="main-content" className="flex-1">
              {children}
            </div>
            {/* Static footer shell: cached server component behind Suspense so
                the PPR shell prerenders while dynamic/auth chrome streams.
                Root layout itself stays uncached (client providers + per-user
                banners must never be inside 'use cache'). */}
            <Suspense
              fallback={
                <footer aria-hidden="true" className="border-t py-8" />
              }
            >
              <CachedSiteFooter />
            </Suspense>
          </div>
          <GreenGuyCamoLazy />
          <UsaFireworksLazy />
        </ThemeProvider>
        </SiteThemeProvider>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <PerfBootstrap />
        <ColorblindFilters />
        <A11yProvider />
        {/* Below-fold / conditional overlays load client-only in split chunks
            (see *-lazy wrappers): EyeDwell + SwitchScan stay mounted globally
            for AT users, fireworks/camo only for their themes. GoogleAnalytics
            stays consent-gated behind Suspense (gold standard). */}
        <EyeDwellLazy />
        <SwitchScanLazy />
        <Analytics />
        <CookieBanner />
      </body>
    </html>
  );
}
