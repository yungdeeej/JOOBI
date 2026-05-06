import { cn } from '../../lib/cn';

export type TokenSymbol = 'SOL' | 'USDC_SOL' | 'USDT_SOL' | 'TON' | 'JOOBI';

const config: Record<TokenSymbol, { gradient: string; label: string; chain: string }> = {
  SOL: { gradient: 'from-[#9945FF] to-[#14F195]', label: 'SOL', chain: 'Solana' },
  USDC_SOL: { gradient: 'from-[#2775CA] to-[#5fa3e0]', label: 'USDC', chain: 'Solana' },
  USDT_SOL: { gradient: 'from-[#26A17B] to-[#5dc4a3]', label: 'USDT', chain: 'Solana' },
  TON: { gradient: 'from-[#0098EA] to-[#5cd0ff]', label: 'TON', chain: 'TON' },
  JOOBI: { gradient: 'from-[#f0abfc] to-[#a855f7]', label: 'JOOBI', chain: 'TON' },
};

export function TokenIcon({
  symbol,
  size = 32,
  className,
}: {
  symbol: TokenSymbol;
  size?: number;
  className?: string;
}) {
  const cfg = config[symbol];
  const fontSize = Math.max(8, Math.floor(size * 0.32));
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-soft ring-1 ring-white/10',
        `bg-gradient-to-br ${cfg.gradient}`,
        className,
      )}
      style={{ width: size, height: size, fontSize }}
      aria-label={cfg.label}
    >
      {cfg.label.slice(0, 4)}
    </span>
  );
}

export const tokenLabel = (symbol: TokenSymbol) => config[symbol].label;
export const tokenChain = (symbol: TokenSymbol) => config[symbol].chain;
