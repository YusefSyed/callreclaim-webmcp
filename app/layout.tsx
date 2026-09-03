import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const siteUrl = new URL(
  'https://callreclaim-agent-desk.yoosefseed.chatgpt.site',
);

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: 'CallReclaim: Agent Rescue Desk',
  description:
    'A synthetic WebMCP missed-call recovery desk where an agent prepares and the owner decides.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'CallReclaim',
    title: 'CallReclaim: Agent Rescue Desk',
    description:
      'A synthetic WebMCP missed-call recovery desk where an agent prepares and the owner decides.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'CallReclaim Agent Rescue Desk',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CallReclaim: Agent Rescue Desk',
    description:
      'A synthetic WebMCP missed-call recovery desk where an agent prepares and the owner decides.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
