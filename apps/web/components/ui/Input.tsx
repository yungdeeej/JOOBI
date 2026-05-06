import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-xl border bg-black/30 px-4 text-zinc-100 placeholder-zinc-500 transition',
        'focus:outline-none focus:ring-2',
        invalid
          ? 'border-rose-500/50 focus:border-rose-500/70 focus:ring-rose-500/20'
          : 'border-white/[0.06] focus:border-brand-400/50 focus:ring-brand-500/20',
        className,
      )}
      {...rest}
    />
  );
});
