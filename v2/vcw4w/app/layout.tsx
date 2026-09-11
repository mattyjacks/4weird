import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { SiteThemeProvider } from "@/components/site/site-theme-provider";
import { COLOR_THEME_IDS, DEFAULT_COLOR_THEME, SITE_COLOR_STORAGE_KEY } from "@/lib/site-theme";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@/components/site/google-analytics";
import { CookieBanner } from "@/components/site/cookie-banner";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { A11yProvider } from "@/components/site/a11y-provider";
import { UsaFireworks } from "@/components/site/themes/usa-fireworks";
import { ColorblindFilters } from "@/components/a11y/colorblind-filters";
import { EyeDwell } from "@/components/a11y/eye-dwell";
import { SwitchScan } from "@/components/a11y/switch-scan";
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
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "4weird Games; rent cloud compute, fund AI-built games",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/twitter-image.png"],
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
            <SiteHeader />
            <div id="main-content" className="flex-1">
              {children}
            </div>
            <SiteFooter />
          </div>
          <UsaFireworks />
        </ThemeProvider>
        </SiteThemeProvider>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <PerfBootstrap />
        <ColorblindFilters />
        <A11yProvider />
        <EyeDwell />
        <SwitchScan />
        <Analytics />
        <CookieBanner />
      </body>
    </html>
  );
}
