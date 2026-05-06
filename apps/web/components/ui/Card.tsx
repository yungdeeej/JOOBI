import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl',
        className,
      )}
      {...rest}
    />
  );
}

export function CardElevated({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-2xl shadow-soft',
        className,
      )}
      {...rest}
    />
  );
}
