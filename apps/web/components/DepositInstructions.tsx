'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const formatTimeLeft = (ms: number): string => {
  if (ms <= 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export function DepositInstructions({
  depositAddress,
  amount,
  sourceToken,
  expiresAt,
}: {
  depositAddress: string;
  amount: string;
  sourceToken: string;
  expiresAt: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = new Date(expiresAt).getTime() - now;

  return (
    <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 space-y-4">
      <h2 className="text-lg font-semibold">Send {sourceToken.replace('_SOL', '')} to deposit address</h2>
      <div className="flex justify-center">
        <div className="rounded-lg bg-white p-3">
          <QRCodeSVG value={depositAddress} size={180} />
        </div>
      </div>
      <div>
        <div className="text-xs text-white/60">Deposit address</div>
        <div className="break-all text-sm font-mono">{depositAddress}</div>
        <button
          type="button"
          className="mt-1 rounded-md bg-brand px-3 py-1 text-xs"
          onClick={() => navigator.clipboard.writeText(depositAddress)}
        >
          Copy address
        </button>
      </div>
      <div>
        <div className="text-xs text-white/60">Exact amount</div>
        <div className="font-mono text-lg">
          {amount} {sourceToken.replace('_SOL', '')}
        </div>
        <button
          type="button"
          className="mt-1 rounded-md bg-brand px-3 py-1 text-xs"
          onClick={() => navigator.clipboard.writeText(amount)}
        >
          Copy amount
        </button>
      </div>
      <div className="rounded-md bg-yellow-900/40 p-3 text-xs text-yellow-200 ring-1 ring-yellow-500/40">
        ⚠ Send only on Solana network. Other networks = lost funds.
      </div>
      <div className="text-center text-sm text-white/70">
        Expires in <span className="font-mono text-lg text-white">{formatTimeLeft(left)}</span>
      </div>
    </div>
  );
}
