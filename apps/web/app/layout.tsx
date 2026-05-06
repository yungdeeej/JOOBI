import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'JoobiSwap — Cross-chain SOL → TON / JOOBI',
  description:
    'Swap SOL, USDC, or USDT on Solana for TON or JOOBI on TON in under two minutes. No wallet connection required.',
  metadataBase: new URL('https://joobiswap.example'),
  openGraph: {
    title: 'JoobiSwap',
    description: 'Cross-chain swaps from Solana to TON in under 2 minutes.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
