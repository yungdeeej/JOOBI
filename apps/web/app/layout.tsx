import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'JoobiSwap — Cross-chain SOL → TON / JOOBI',
  description:
    'Swap SOL, USDC, or USDT on Solana for TON or JOOBI on TON. No wallet connection required.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
