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

function ScanningBlock() {
  const [logs, setLogs] = useState<string[]>([
    '> INIT CONNECTION...',
    '[SYS] SECURE CHANNEL ESTABLISHED',
    'WAITING FOR TELEMETRY...'
  ]);

  useEffect(() => {
    const phrases = [
      '[NET] SYNCING MEMPOOL',
      '[VAL] PARSING SIGNATURES',
      '[MEM] BUFFER POOL NORMAL',
      '[SYS] HEARTBEAT OK',
      '[INT] ANALYZING CAPABILITIES',
      '[ERR] ORPHAN DETECTED',
      '[NET] LISTENING...'
    ];
    
    const interval = setInterval(() => {
      const hex = '0x' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase();
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      setLogs(prev => {
        const next = [...prev, `${phrase} ${hex}`];
        if (next.length > 5) next.shift();
        return next;
      });
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', gap: 6, 
      fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', 
      textAlign: 'right', whiteSpace: 'nowrap', 
      borderRight: '1px solid var(--accent)', paddingRight: 12,
      paddingBottom: 8, opacity: 0.7
    }}>
      {logs.map((log, i) => (
        <div key={i} style={{ color: i === logs.length - 1 ? 'var(--ink-2)' : 'inherit' }}>
          {log}
        </div>
      ))}
    </div>
  );
}

export default function LeftOnTableCounter({ stats, isFlashing }: Props) {
  const animated = useAnimatedValue(stats.totalUsdcLost);
  const topCategory = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  const avgBounty = stats.totalJobs > 0 ? `$${(stats.totalUsdcLost / stats.totalJobs).toFixed(0)}` : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="live-dot" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Real-time market scan active</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(80px, 12vw, 180px)',
                fontWeight: 400,
                letterSpacing: '-0.06em',
                lineHeight: 0.85,
                color: 'var(--ink)',
                fontVariantNumeric: 'tabular-nums',
                transform: isFlashing ? 'scale(1.01)' : 'scale(1)',
                transition: 'transform 0.1s ease',
              }}
            >
              {formatUsdc(animated)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingLeft: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--ink-3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                LEFT ON THE TABLE
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', padding: '4px 12px', background: 'rgba(138, 154, 134, 0.1)', borderRadius: 4 }}>
                +12.4% today
              </div>
              {isFlashing && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', animation: 'fade-in 0.15s ease-out' }}>
                  ↑ NEW FAILURE
                </span>
              )}
            </div>
          </div>
          
          <ScanningBlock />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 64, borderTop: '1px solid var(--border)', paddingTop: 24, marginTop: 48, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Failed Jobs</div>
          <div className="metric-num" style={{ fontSize: 28 }}>{stats.totalJobs}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Skills Tracked</div>
          <div className="metric-num" style={{ fontSize: 28 }}>{stats.topSkills.length}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Avg. Bounty</div>
          <div className="metric-num" style={{ fontSize: 28 }}>{avgBounty}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Top Category</div>
          <div className="metric-num" style={{ fontSize: 28 }}>{topCategory}</div>
        </div>
      </div>
    </div>
  );
}
