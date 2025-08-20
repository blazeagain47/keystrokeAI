// src/app/layout.tsx
import type { Metadata } from 'next'
import AuthGate from '@/components/auth/AuthGate'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import Header from '@/components/Header'
import GlobalFireBackdrop from '@/components/brand/GlobalFireBackdrop'
import AppBoot from '@/components/AppBoot'
import SettingsModal from '@/components/settings/SettingsModal'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'blazeKey',
  applicationName: 'blazeKey',
  description: 'AI-powered typing practice platform',
  icons: {
    icon: [
      {
        url: '/next.svg',
        type: 'image/svg+xml',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${inter.className} page-bg bk-flame-bg min-h-dvh antialiased overflow-x-clip`}>
        {/* Client bootstrap for auth + appearance */}
        <AppBoot />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GlobalFireBackdrop />
          <Header />
          {children}
          {/* Global auth modal gate */}
          <AuthGate />
        </ThemeProvider>
        <SettingsModal />
      </body>
    </html>
  )
}