import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'orange' | 'danger' | 'brand';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-white/[0.06] text-zinc-300 ring-white/[0.08]',
  success: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  orange: 'bg-orange-500/10 text-orange-300 ring-orange-500/30',
  danger: 'bg-rose-500/10 text-rose-300 ring-rose-500/30',
  brand: 'bg-brand-500/10 text-brand-300 ring-brand-500/30',
};

export function Badge({ className, tone = 'neutral', ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        toneClasses[tone],
        className,
      )}
      {...rest}
    />
  );
}
