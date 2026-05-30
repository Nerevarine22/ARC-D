import type { Stats } from '../hooks/useStats';

/* ── Sparkline ─────────────────────────────────────────────── */
function Spark({ points, color = 'var(--ink)' }: { points: number[]; color?: string }) {
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

/* ── Gauge ─────────────────────────────────────────────────── */
function Gauge({ value, color = 'var(--ink)' }: { value: number; color?: string }) {
  const R = 20, C = 2 * Math.PI * R;
  const arc = C * Math.min(value / 100, 1);
  return (
    <div style={{ position: 'relative', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={R} fill="none" stroke="var(--border)" strokeWidth="3" transform="rotate(-90 26 26)" />
        <circle cx="26" cy="26" r={R} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${arc} ${C - arc}`} transform="rotate(-90 26 26)"
          style={{ transition: 'stroke-dasharray 0.9s ease-out' }} />
      </svg>
      <span className="mono-val" style={{ position: 'absolute', fontSize: 11, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

/* ── Insight card ──────────────────────────────────────────── */
function Card({
  index, label, value, valueSuffix, sub, trend, trendUp,
  spark, sparkColor, gauge, accentColor = 'var(--ink)',
}: {
  index: string; label: string;
  value: string; valueSuffix?: string; sub?: string;
  trend?: string; trendUp?: boolean;
  spark?: number[]; sparkColor?: string;
  gauge?: number; accentColor?: string;
}) {
  return (
    <div
      style={{
        borderTop: `2px solid ${accentColor}`,
        paddingTop: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <div className="sys-label" style={{ color: 'var(--ink-4)', marginBottom: 4 }}>
            {index}
          </div>
          <div className="sys-label">{label}</div>
        </div>
        {gauge !== undefined && <Gauge value={gauge} color={accentColor} />}
      </div>

      {/* Value */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div
            className="metric-num"
            style={{
              fontSize: 'clamp(20px, 2.2vw, 28px)',
              color: accentColor === 'var(--ink)' ? 'var(--ink)' : accentColor,
            }}
          >
            {value}
            {valueSuffix && (
              <span
                className="mono-val"
                style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-4)', marginLeft: 4 }}
              >
                {valueSuffix}
              </span>
            )}
          </div>
          {sub && (
            <div className="sys-label" style={{ marginTop: 5 }}>{sub}</div>
          )}
          {trend && (
            <div
              className="sys-label"
              style={{
                marginTop: 4,
                color: trendUp ? 'var(--red)' : 'var(--green)',
              }}
            >
              {trendUp ? '↑' : '↓'} {trend}
            </div>
          )}
        </div>
        {spark && <Spark points={spark} color={sparkColor ?? 'var(--ink)'} />}
      </div>
    </div>
  );
}

/* ── Static data ────────────────────────────────────────────── */
const S_UP    = [3, 5, 4, 7, 6, 9, 8, 12, 10, 14, 13, 16];
const S_SPIKE = [6, 5, 7, 6, 8, 7, 14, 19, 16, 20, 18, 22];
const S_PRED  = [8, 9, 10, 11, 10, 12, 14, 16, 17, 19, 21, 23];
const S_OPP   = [4, 6, 5, 8, 7, 9, 8, 11, 10, 12, 14, 13];

/* ── Main ───────────────────────────────────────────────────── */
export default function InsightsCards({ stats }: { stats: Stats }) {
  const biggest   = stats.recentJobs.reduce((m, j) => (j.bountyAmount > m ? j.bountyAmount : m), 0);
  const risingGap = stats.topSkills[1]?.skill || 'Smart Contract Audit';

  return (
    <div>
      {/* Description */}
      <p className="body-text" style={{ fontSize: 13, marginBottom: 32, maxWidth: 560 }}>
        Derived intelligence from the failure stream: bounty sizing, skill demand velocity,
        agent readiness, and predicted economic leakage.
      </p>

      {/* 3-column grid, then 3-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0 48px' }}>
        <Card
          index="A" label="Biggest Missed Bounty"
          value={`$${biggest.toLocaleString()}`}
          trend="24% vs prev hour" trendUp
          spark={S_UP} sparkColor="var(--ink)"
          accentColor="var(--ink)"
        />
        <Card
          index="B" label="Fastest Rising Gap"
          value={risingGap.length > 20 ? risingGap.slice(0, 18) + '…' : risingGap}
          sub={`${stats.topSkills[1]?.count ?? 0} occurrences`}
          trend="24% demand surge" trendUp
          spark={S_SPIKE} sparkColor="var(--ink-3)"
          accentColor="var(--ink-3)"
        />
        <Card
          index="C" label="Agent Readiness Score"
          value="42" valueSuffix="/ 100"
          trend="needs ecosystem training" trendUp
          gauge={42}
          accentColor="var(--ink)"
        />
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', margin: '32px 0' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0 48px' }}>
        <Card
          index="D" label="Predicted Leakage · 1h"
          value="~$18,500"
          trend="model confidence 87%" trendUp={false}
          spark={S_PRED} sparkColor="var(--ink)"
          accentColor="var(--ink)"
        />
        <Card
          index="E" label="Unusual Demand Spike"
          value="Flash Loan Arb"
          trend="+340% vs baseline" trendUp
          spark={S_SPIKE} sparkColor="var(--ink-3)"
          accentColor="var(--ink-3)"
        />
        <Card
          index="F" label="Opportunity Window"
          value="Oracle Validation"
          sub="Closes in ~18 min"
          trend="12% gap open" trendUp={false}
          spark={S_OPP} sparkColor="var(--ink)"
          accentColor="var(--ink)"
        />
      </div>
    </div>
  );
}
