import { SwapForm } from '../components/SwapForm';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { TrustStrip } from '../components/TrustStrip';
import { RecentSwapsTicker } from '../components/RecentSwapsTicker';
import { CardElevated } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { AlertTriangle, ChevronDown } from '../components/ui/Icons';

export default function Home() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 pt-10 pb-12">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_minmax(0,440px)] lg:items-start">
          {/* Hero */}
          <section className="space-y-6 lg:pt-6">
            <Badge tone="brand" className="px-3 py-1 text-[11px]">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-brand-300" />
              Live · Stubbed mode
            </Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Swap <span className="bg-gradient-brand bg-clip-text text-transparent">SOL → TON & JOOBI</span>
              <br />
              in under two minutes.
            </h1>
            <p className="max-w-prose text-lg text-zinc-400">
              No wallet connection. No accounts. Send from any exchange or wallet — receive at
              your TON address.
            </p>

            <TrustStrip />

            <RecentSwapsTicker />

            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4 text-sm text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div>
                <strong className="font-semibold">JOOBI on TON ≠ JOOBI on Solana.</strong> This
                site only supports the TON jetton{' '}
                <span className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[11px]">
                  EQB5jq…IJiaL
                </span>
                . The Solana token of the same name is unrelated.
              </div>
            </div>
          </section>

          {/* Swap card */}
          <CardElevated className="p-5 lg:sticky lg:top-24">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Cross-chain swap</h2>
              <Badge tone="neutral">No wallet connect</Badge>
            </div>
            <SwapForm />
          </CardElevated>
        </div>

        {/* How it works */}
        <section id="how-it-works" className="mt-24 space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
            <p className="mt-2 text-zinc-400">Four steps. No surprises.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Step
              n={1}
              title="Quote"
              body="Pick a source token, amount, and TON destination. Get a live quote with all fees."
            />
            <Step
              n={2}
              title="Deposit"
              body="We generate a one-time Solana deposit address. Send from any wallet or exchange."
            />
            <Step
              n={3}
              title="Bridge"
              body="Symbiosis bridges to TON. STON.fi swaps to JOOBI if requested."
            />
            <Step
              n={4}
              title="Receive"
              body="TON or JOOBI lands at your address. The deposit wallet is destroyed."
            />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto mt-24 max-w-3xl space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-center">Frequently asked</h2>
          <div className="mt-6 space-y-2">
            <FAQ
              q="What is JOOBI?"
              a="JOOBI is a jetton on TON traded on STON.fi. The contract address is EQB5jqHoxZ8aiZdznfVb4ARrr7sBSEnTdZXmKDNu5TOIJiaL — verify before swapping. The Solana token with the same name is unrelated."
            />
            <FAQ
              q="How long does a swap take?"
              a="Typically 60–120 seconds end-to-end. Solana confirmation is the fastest leg; the cross-chain bridge takes most of the time."
            />
            <FAQ
              q="What happens if my swap fails?"
              a="If a deposit arrives but the bridge or DEX leg fails, an automatic refund is initiated. Funds are never held without a path back to you. Refunds for amounts over $500 are reviewed manually."
            />
            <FAQ
              q="What are the fees?"
              a="A 1% platform fee plus the bridge and DEX fees set by Symbiosis and STON.fi. The live quote shows the all-in price; you only pay what you confirm."
            />
            <FAQ
              q="Do I need to connect a wallet?"
              a="No. You enter a TON destination address and send SOL/USDC/USDT to a one-time deposit address from any wallet or exchange. We never ask for keys, signatures, or sessions."
            />
            <FAQ
              q="Is my country supported?"
              a="The service is unavailable in the United States, Iran, North Korea, Syria, and Cuba."
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-xl">
      <div className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-white shadow-glow">
        {n}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-zinc-400">{body}</p>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-xl transition open:bg-white/[0.04]">
      <summary className="flex cursor-pointer list-none items-center justify-between text-base font-medium text-zinc-100">
        <span>{q}</span>
        <ChevronDown className="h-4 w-4 text-zinc-500 transition group-open:rotate-180" />
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">{a}</p>
    </details>
  );
}
