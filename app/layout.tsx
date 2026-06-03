import type { Metadata, Viewport } from 'next'
import './globals.css'
import InstallPrompt from '@/components/InstallPrompt'

export const metadata: Metadata = {
  title: 'CYA CDO Mindanao Conference',
  description: 'Bus attendance monitoring for CYA CDO Mindanao Conference',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CYA CDO Attendance',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body suppressHydrationWarning>
        <InstallPrompt />
        {children}
      </body>
    </html>
  )
}
