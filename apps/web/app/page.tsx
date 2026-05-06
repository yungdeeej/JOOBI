import { SwapForm } from '../components/SwapForm';

export default function Home() {
  return (
    <main className="mx-auto max-w-xl px-4 py-10 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold">JoobiSwap</h1>
        <p className="text-white/70">
          Swap SOL → TON & JOOBI in under 2 minutes. No wallet connection needed.
        </p>
      </header>

      <SwapForm />

      <section className="rounded-xl bg-yellow-900/30 p-4 text-sm text-yellow-100 ring-1 ring-yellow-500/40">
        <strong>Disambiguation:</strong> JOOBI on TON
        (<span className="font-mono">EQB5jq…IJiaL</span>) is unrelated to JOOBI on Solana. Only
        the TON jetton is supported here.
      </section>

      <section className="space-y-3 text-sm text-white/80">
        <h2 className="text-lg font-semibold">FAQ</h2>
        <details className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
          <summary className="cursor-pointer">What is JOOBI?</summary>
          <p className="mt-2 text-white/70">A jetton on TON traded on STON.fi.</p>
        </details>
        <details className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
          <summary className="cursor-pointer">How long does this take?</summary>
          <p className="mt-2 text-white/70">Typically under 2 minutes end-to-end.</p>
        </details>
        <details className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
          <summary className="cursor-pointer">What if my swap fails?</summary>
          <p className="mt-2 text-white/70">
            If a deposit arrives but the swap fails, an automatic refund is initiated to a Solana
            address you provide on the status page. Funds are never held without a path back to you.
          </p>
        </details>
        <details className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
          <summary className="cursor-pointer">What are the fees?</summary>
          <p className="mt-2 text-white/70">
            Platform fee: 1%. Bridge + DEX fees vary; the live quote shows the all-in price.
          </p>
        </details>
      </section>

      <footer className="text-xs text-white/40 text-center">
        Funds touch our system for under 90 seconds. Service unavailable in restricted regions.
      </footer>
    </main>
  );
}
