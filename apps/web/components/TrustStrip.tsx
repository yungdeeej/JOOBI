'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { Clock, Shield, Zap, Wallet } from './ui/Icons';
import { Skeleton } from './ui/Skeleton';

export function TrustStrip() {
  const { data, isLoading } = useQuery({
    queryKey: ['stats-summary'],
    queryFn: () => apiClient.getStats().catch(() => ({ total: 0, completed: 0, active: 0 })),
    refetchInterval: 30_000,
  });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat
        icon={<Clock className="h-4 w-4" />}
        label="Avg. settlement"
        value="~90s"
      />
      <Stat
        icon={<Wallet className="h-4 w-4" />}
        label="Wallet connect"
        value="None"
      />
      <Stat
        icon={<Shield className="h-4 w-4" />}
        label="Custody"
        value="Ephemeral"
      />
      <Stat
        icon={<Zap className="h-4 w-4" />}
        label="Swaps completed"
        value={
          isLoading ? (
            <Skeleton className="h-5 w-12" />
          ) : (
            (data?.completed ?? 0).toLocaleString()
          )
        }
      />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 backdrop-blur-xl">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/10 text-brand-300 ring-1 ring-inset ring-brand-500/20">
        {icon}
      </span>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
        <div className="text-sm font-semibold text-white">{value}</div>
      </div>
    </div>
  );
}
