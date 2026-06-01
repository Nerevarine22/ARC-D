import type { Stats } from '../hooks/useStats';

export default function InsightsCards({ stats }: { stats: Stats }) {
  const categories = [
    { label: 'DEFI', key: 'DeFi' },
    { label: 'DATA', key: 'Data-Parsing' },
    { label: 'INFRA', key: 'Infrastructure' },
    { label: 'SECURITY', key: 'Security' },
  ];

  const total = Object.values(stats.byCategory).reduce((s, v) => s + v, 0) || 1;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="sys-label accent">MARKET BREAKDOWN</span>
        <span className="sys-label">Live</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1, justifyContent: 'center' }}>
        {categories.map(({ label, key }, i) => {
          const val = stats.byCategory[key] ?? 0;
          const pct = Math.round((val / total) * 100);
          
          // Generate blocks based on percentage (e.g., max 28 blocks)
          const maxBlocks = 28;
          const numBlocks = Math.max(1, Math.round((pct / 100) * maxBlocks));
          const blocks = '█'.repeat(numBlocks);
          
          const trendUp = (i % 2) === 0;

          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 70, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)', letterSpacing: '0.05em' }}>
                {label}
              </div>
              <div style={{ flex: 1, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '-0.02em', overflow: 'hidden', whiteSpace: 'nowrap', opacity: 0.8 }}>
                {blocks}
              </div>
              <div className="mono-val" style={{ width: 40, textAlign: 'right', fontSize: 13, color: 'var(--ink)' }}>
                {pct}%
              </div>
              <div style={{ width: 16, textAlign: 'right', fontSize: 12, color: trendUp ? 'var(--accent)' : 'var(--ink-4)' }}>
                {trendUp ? '↑' : '↓'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
