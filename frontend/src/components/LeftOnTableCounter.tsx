import { useEffect, useRef, useState } from 'react';
import type { Stats } from '../hooks/useStats';

interface Props {
  stats: Stats;
  isFlashing?: boolean;
}

function formatUsdc(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000)     return `$${(val / 1_000).toFixed(2)}K`;
  return `$${val.toFixed(2)}`;
}

function useAnimatedValue(target: number, duration = 800): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef  = useRef<number>(0);

  useEffect(() => {
    const start = prevRef.current;
    const t0 = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (target - start) * e);
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
      else prevRef.current = target;
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

export default function LeftOnTableCounter({ stats, isFlashing }: Props) {
  const animated = useAnimatedValue(stats.totalUsdcLost);
  const topCategory = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  const avgBounty = stats.totalJobs > 0 ? `$${(stats.totalUsdcLost / stats.totalJobs).toFixed(0)}` : '—';

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '100%' }}>
      {/* Left Column: Label & Stats */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 32 }}>
          <span className="sys-label solid" style={{ fontSize: 13, padding: '6px 16px', background: 'rgba(0,0,0,0.06)' }}>
            TOTAL UNMET DEMAND
          </span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 48px' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>Failed Jobs</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{stats.totalJobs}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>Skills Tracked</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{stats.topSkills.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>Avg. Bounty</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{avgBounty}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>Top Category</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{topCategory}</div>
          </div>
        </div>
      </div>

      {/* Right Column: Large Value */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: 8 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(64px, 10vw, 150px)',
            fontWeight: 500,
            letterSpacing: '-0.06em',
            lineHeight: 0.9,
            color: '#111',
            fontVariantNumeric: 'tabular-nums',
            transform: isFlashing ? 'scale(1.02)' : 'scale(1)',
            transition: 'transform 0.2s ease',
          }}
        >
          {formatUsdc(animated)}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
          {isFlashing && (
            <span
              className="sys-label"
              style={{ color: 'var(--red)', animation: 'fade-in 0.15s ease-out' }}
            >
              ↑ NEW FAILURE
            </span>
          )}
          <span style={{ fontSize: 18, fontWeight: 700, color: 'rgba(0,0,0,0.4)', letterSpacing: '0.2em' }}>
            TOTAL LEFT ON TABLE
          </span>
        </div>
      </div>
    </div>
  );
}
