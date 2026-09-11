import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@/components/site/google-analytics";
import { CookieBanner } from "@/components/site/cookie-banner";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { A11yProvider } from "@/components/site/a11y-provider";
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
        alt: "4weird Games — rent cloud compute, fund AI-built games",
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
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
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
        </ThemeProvider>
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
