const JOOBI_TON = 'EQB5jqHoxZ8aiZdznfVb4ARrr7sBSEnTdZXmKDNu5TOIJiaL';
const TONAPI = 'https://tonapi.io/v2';
const STONFI = 'https://api.ston.fi/v1';
const DEXSCREENER = 'https://api.dexscreener.com/latest/dex';

interface CheckResult {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
}

const results: CheckResult[] = [];

const log = (name: string, status: CheckResult['status'], message: string) => {
  results.push({ name, status, message });
  const icon = status === 'PASS' ? '✓' : status === 'WARN' ? '⚠' : '✗';
  console.log(`${icon} ${name}: ${message}`);
};

const safeFetch = async <T = unknown>(url: string): Promise<T | null> => {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
};

interface JettonMeta {
  metadata?: { name?: string; symbol?: string };
  holders_count?: number;
  mintable?: boolean;
  verification?: string;
}

interface DexScreenerResponse {
  pairs?: Array<{ chainId?: string; liquidity?: { usd?: number } }>;
}

const main = async () => {
  console.log('\n=== JOOBI Pre-Build Audit ===\n');

  const meta = await safeFetch<JettonMeta>(`${TONAPI}/jettons/${JOOBI_TON}`);
  if (!meta) {
    log('contract', 'FAIL', 'Contract not found via TonAPI');
  } else {
    log('contract', 'PASS', `${meta.metadata?.name ?? 'unknown'} (${meta.metadata?.symbol ?? '?'})`);
    log(
      'holders',
      (meta.holders_count ?? 0) >= 100 ? 'PASS' : 'WARN',
      `${meta.holders_count ?? 0} holders`,
    );
    log('mintable', meta.mintable === false ? 'PASS' : 'FAIL', `mintable: ${meta.mintable}`);
    log(
      'verification',
      meta.verification === 'whitelist' ? 'PASS' : 'WARN',
      `whitelist: ${meta.verification ?? 'none'}`,
    );
  }

  const asset = await safeFetch<{ asset?: unknown }>(`${STONFI}/assets/${JOOBI_TON}`);
  if (!asset?.asset) {
    log('stonfi', 'FAIL', 'Not listed on STON.fi');
  } else {
    log('stonfi', 'PASS', 'Listed on STON.fi');
  }

  const ds = await safeFetch<DexScreenerResponse>(`${DEXSCREENER}/tokens/${JOOBI_TON}`);
  const tonPair = ds?.pairs?.find((p) => p.chainId === 'ton');
  if (!tonPair) {
    log('dexscreener', 'FAIL', 'No TON pair found');
  } else {
    const liquidity = tonPair.liquidity?.usd ?? 0;
    log(
      'liquidity',
      liquidity >= 25000 ? 'PASS' : liquidity >= 10000 ? 'WARN' : 'FAIL',
      `$${liquidity.toFixed(0)} liquidity`,
    );
    console.log('\n  Slippage simulation:');
    [50, 100, 250, 500, 1000, 2500, 5000].forEach((usd) => {
      const slip = liquidity > 0 ? (usd / liquidity) * 100 : Infinity;
      console.log(`    $${usd.toString().padEnd(6)}  ${slip.toFixed(2)}%`);
    });
  }

  const failed = results.filter((r) => r.status === 'FAIL').length;
  const warned = results.filter((r) => r.status === 'WARN').length;
  console.log('\n=== Summary ===');
  console.log(
    `PASS: ${results.filter((r) => r.status === 'PASS').length} | WARN: ${warned} | FAIL: ${failed}`,
  );

  if (failed > 0) {
    console.log('\n🚨 BUILD HALT — fix FAIL items before proceeding');
    process.exit(1);
  } else if (warned > 2) {
    console.log('\n⚠ Proceed with caution');
  } else {
    console.log('\n✓ Cleared to build');
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
