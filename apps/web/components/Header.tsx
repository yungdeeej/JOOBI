import Link from 'next/link';
import { Sparkle } from './ui/Icons';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.04] bg-zinc-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand shadow-glow">
            <Sparkle className="h-4 w-4 text-white" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            JoobiSwap
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 sm:flex">
          <a href="#how-it-works" className="hover:text-white">How it works</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
          <a
            href="https://docs.symbiosis.finance/developer-tools/symbiosis-api"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white"
          >
            Docs
          </a>
        </nav>
      </div>
    </header>
  );
}
