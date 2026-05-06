'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { TokenIcon, tokenLabel, type TokenSymbol } from './ui/TokenIcon';
import { AlertTriangle, Check, Copy, Clock } from './ui/Icons';

const formatTimeLeft = (ms: number): string => {
  if (ms <= 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

export function DepositInstructions({
  depositAddress,
  amount,
  sourceToken,
  expiresAt,
}: {
  depositAddress: string;
  amount: string;
  sourceToken: TokenSymbol;
  expiresAt: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = new Date(expiresAt).getTime() - now;
  const totalMs = 20 * 60 * 1000;
  const pct = Math.max(0, Math.min(100, (left / totalMs) * 100));
  const urgency = left < 5 * 60 * 1000 ? 'danger' : left < 10 * 60 * 1000 ? 'warning' : 'success';

  return (
    <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-6 backdrop-blur-2xl shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TokenIcon symbol={sourceToken} size={28} />
          <div>
            <div className="text-sm font-semibold text-white">
              Send {tokenLabel(sourceToken)}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">
              on Solana
            </div>
          </div>
        </div>
        <Badge tone={urgency}>
          <Clock className="h-3 w-3" />
          <span className="font-mono tabular-nums">{formatTimeLeft(left)}</span>
        </Badge>
      </div>

      <div className="flex justify-center py-2">
        <div className="rounded-2xl bg-white p-3 shadow-glow">
          <QRCodeSVG value={depositAddress} size={196} level="M" />
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px] uppercase tracking-wider text-zinc-500">
          Deposit address
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
          <div className="break-all font-mono text-xs text-zinc-200">{depositAddress}</div>
          <div className="mt-2">
            <CopyButton value={depositAddress} label="Copy address" />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px] uppercase tracking-wider text-zinc-500">
          Exact amount
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
          <div className="font-mono text-2xl font-semibold tabular-nums text-white">
            {amount} {tokenLabel(sourceToken)}
          </div>
          <div className="mt-2">
            <CopyButton value={amount} label="Copy amount" />
          </div>
        </div>
      </div>

      {/* Countdown progress bar */}
      <div className="space-y-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full bg-gradient-brand transition-all duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs text-amber-100">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
        <span>
          Send only on the <strong>Solana</strong> network. Funds sent on the wrong network are
          unrecoverable.
        </span>
      </div>
    </div>
  );
}
