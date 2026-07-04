import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Office Pulse — Live Office Monitor',
  description:
    'Real-time monitoring for office lights and fans. Track power usage, device status, and alerts across 3 rooms.',
  keywords: ['office', 'IoT', 'monitoring', 'energy', 'smart office'],
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0F1A' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} bg-background h-full`}
      suppressHydrationWarning
    >
      {/*
        This script runs synchronously before the browser paints anything.
        It reads the user's stored preference from localStorage and applies
        the correct class to <html> immediately, preventing any flash of
        the wrong theme on page load or refresh.
      */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('op-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-background text-foreground font-sans antialiased h-full">
        {children}
      </body>
    </html>
  )
}
