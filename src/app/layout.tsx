import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteConfig } from "@/lib/config/site";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.heroHeadline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.heroDescription,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="light" data-theme="light" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-canvas text-foreground antialiased">
        <ThemeProvider>
          <ToastProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3.5 focus:py-2 focus:text-xs focus:font-medium focus:text-accent-foreground"
            >
              Skip to main content
            </a>
            <Navbar />
            <div id="main-content" className="flex-1">
              {children}
            </div>
            <Footer />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
