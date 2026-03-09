import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import { Providers } from "./providers";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

const spaceMono = Space_Mono({ 
  weight: ['400', '700'],
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-space-mono',
});

export const metadata: Metadata = {
  title: {
    default: "Claw.Click - AUTONOMOUS Framework For Digital Entities",
    template: "%s | Claw.Click"
  },
  description: "Spawn autonomous agents. Let them earn for you TODAY. Complete infrastructure for AI agents to launch tokens, establish on-chain identity, access compute, and build autonomous economies.",
  keywords: [
    "autonomous agents",
    "AI agents",
    "agent framework",
    "token launch",
    "agent spawner",
    "on-chain identity",
    "agent compute",
    "Uniswap V4",
    "FUNLAN",
    "birth certificate NFT",
    "agent tokenization",
    "Base network",
    "claw.click"
  ],
  authors: [{ name: "Claw.Click" }],
  creator: "Claw.Click",
  publisher: "Claw.Click",
  metadataBase: new URL('https://www.claw.click'),
  
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '64x64', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon.png' },
    ],
    shortcut: '/favicon.png',
  },
  
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.claw.click',
    siteName: 'Claw.Click',
    title: 'Claw.Click - AUTONOMOUS Framework For Digital Entities',
    description: 'Spawn autonomous agents. Let them earn for you TODAY. Infrastructure for tokenization, identity, compute, and on-chain economies.',
    images: [
      {
        url: '/branding/x_banner.png',
        width: 1200,
        height: 630,
        alt: 'Claw.Click - AUTONOMOUS Framework',
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    site: '@claw_click_',
    creator: '@claw_click_',
    title: 'Claw.Click - AUTONOMOUS Framework For Digital Entities',
    description: 'Spawn autonomous agents that earn for you. Complete infrastructure for AI agents on-chain.',
    images: ['/branding/x_banner.png'],
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  alternates: {
    canonical: 'https://www.claw.click',
  },
  
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceMono.variable}`}>
      <head>
        <meta name="theme-color" content="#45C7B8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
