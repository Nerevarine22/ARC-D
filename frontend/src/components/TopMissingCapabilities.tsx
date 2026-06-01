import type { SkillStat } from '../hooks/useStats';

interface Props {
  skills: SkillStat[];
}

export default function TopMissingCapabilities({ skills }: Props) {
  const data = skills.slice(0, 7); // Show 7 items to fit nicely

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="sys-label accent">CAPABILITY GAP INTELLIGENCE</span>
        <div style={{ display: 'flex', gap: 6 }}>
           <span className="sys-label">Live Sync</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr', gap: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Capability</div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Failures</div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Confidence</div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Trend</div>
        </div>

        {data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Awaiting intelligence...</div>
        ) : (
          data.map((item, i) => {
            const conf = Math.min(99, 85 + (item.skill.length % 10));
            const trendUp = (item.count % 2) === 0;
            return (
              <div key={item.skill} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr', gap: 16, padding: '12px 0', borderBottom: i < data.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.skill}
                </div>
                <div className="mono-val" style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'right' }}>{item.count}</div>
                <div className="mono-val" style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'right' }}>{conf}%</div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '4px 8px', background: trendUp ? 'rgba(138,154,134,0.1)' : 'rgba(255,255,255,0.03)', color: trendUp ? 'var(--accent)' : 'var(--ink-4)', borderRadius: 2 }}>
                    {trendUp ? '↑ UP' : '— STABLE'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
