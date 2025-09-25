// src/app/layout.tsx
import type { Metadata } from "next";
import React, { Suspense } from "react";
import AuthGate from "@/components/auth/AuthGate";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/Header";
import GlobalFireBackdrop from "@/components/brand/GlobalFireBackdrop";
import AppBoot from "@/components/AppBoot";
import SettingsModal from "@/components/settings/SettingsModal";
import HotkeysGlobal from "@/components/system/HotkeysGlobal";
import PerfBootMarker from "@/components/PerfBootMarker";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"], display: "swap", preload: true });

export const metadata: Metadata = {
  title: "blazeKey",
  applicationName: "blazeKey",
  description: "AI-powered typing practice platform",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-48x48-bk1.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [
      {
        rel: "icon",
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "icon",
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${inter.className} page-bg bk-flame-bg min-h-dvh antialiased overflow-x-clip`}
      >
        <Suspense fallback={null}>
          {/* Client bootstrap for auth + appearance */}
          <AppBoot />
          <PerfBootMarker />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <GlobalFireBackdrop />
            <Header />
            <HotkeysGlobal />
            {children}
            {/* Global auth modal gate */}
            <AuthGate />
            <SettingsModal />
          </ThemeProvider>
        </Suspense>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
