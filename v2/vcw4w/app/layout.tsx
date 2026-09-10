import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://4weird.games");

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "4weird Games — Future Forward Fun",
    template: "%s | 4weird Games",
  },
  description: "A strange, joyful arcade of experiments, simulations, and worlds made for curious people.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div id="main-content">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
