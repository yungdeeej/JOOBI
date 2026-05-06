export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/[0.04]">
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-zinc-500">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-zinc-300">JoobiSwap</div>
            <div className="text-xs">Cross-chain SOL → TON / JOOBI in under 2 minutes.</div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <a href="#" className="hover:text-zinc-200">Terms</a>
            <a href="#" className="hover:text-zinc-200">Privacy</a>
            <a href="#" className="hover:text-zinc-200">Contact</a>
            <a
              href="https://tonviewer.com/EQB5jqHoxZ8aiZdznfVb4ARrr7sBSEnTdZXmKDNu5TOIJiaL"
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-200"
            >
              JOOBI contract
            </a>
          </div>
        </div>
        <div className="mt-6 text-xs text-zinc-600">
          Service unavailable in restricted regions (US, IR, KP, SY, CU). Funds touch our system
          for under 90 seconds.
        </div>
      </div>
    </footer>
  );
}
