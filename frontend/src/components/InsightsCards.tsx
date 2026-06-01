import type { Stats } from '../hooks/useStats';

/* ── Sparkline ─────────────────────────────────────────────── */
function Spark({ points, color = '#111' }: { points: number[]; color?: string }) {
  const W = 64, H = 24;
  const min = Math.min(...points), max = Math.max(...points);
  const r = max - min || 1;
  const step = W / (points.length - 1);
  const coords = points.map((v, i) => ({
    x: i * step,
    y: H - ((v - min) / r) * (H - 4) - 2,
  }));
  const d = coords.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt.x},${pt.y}`;
    const p = coords[i - 1], cx = (p.x + pt.x) / 2;
    return `${acc} C${cx},${p.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
  }, '');
  const last = coords[coords.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ overflow: 'visible' }}>
      <path d={`${d} L${W},${H} L0,${H}Z`} fill={color} fillOpacity="0.06" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r="2.5" fill={color} />
    </svg>
  );
}

const S_SPIKE = [6, 5, 7, 6, 8, 7, 14, 19, 16, 20, 18, 22];

export default function InsightsCards({ stats }: { stats: Stats }) {
  const risingGap = stats.topSkills[1]?.skill || 'Smart Contract Audit';

  return (
    <div className="bento-card" style={{ background: 'var(--bento-purple)', color: '#111', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
      <div>
        <span className="sys-label solid" style={{ padding: '6px 16px', fontSize: 13, background: 'rgba(255,255,255,0.2)' }}>
          Category Breakdown
        </span>
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 32px' }}>
          {[
            { label: 'DeFi',    key: 'DeFi' },
            { label: 'Security',key: 'Security' },
            { label: 'Data',    key: 'Data-Parsing' },
            { label: 'Infra',   key: 'Infrastructure' },
          ].map(({ label, key }) => {
            const total = Object.values(stats.byCategory).reduce((s, v) => s + v, 0) || 1;
            const pct = (((stats.byCategory[key] ?? 0) / total) * 100).toFixed(0);
            return (
              <div key={key}>
                <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {pct}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: 12, padding: 16, marginTop: 24, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
           <div>
             <div style={{ fontSize: 12, fontWeight: 600 }}>Fastest Rising Gap</div>
             <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.6)', marginTop: 2 }}>{risingGap}</div>
           </div>
           <Spark points={S_SPIKE} color="#111" />
         </div>
      </div>
    </div>
  );
}
