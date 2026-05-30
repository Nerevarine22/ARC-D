import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
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

export default function LeftOnTableCounter({ value, isFlashing }: Props) {
  const animated = useAnimatedValue(value);

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 6,
        paddingTop: 4,
      }}
    >
      {/* Label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}
      >
        <span className="live-dot" />
        <span className="sys-label">TOTAL LEFT ON TABLE · USDC · ALL TIME</span>
      </div>

      {/* Number */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(64px, 9vw, 130px)',
          fontWeight: 900,
          letterSpacing: '-0.06em',
          lineHeight: 1,
          color: 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
          transform: isFlashing ? 'scale(1.008)' : 'scale(1)',
          transition: 'transform 0.2s ease',
        }}
      >
        {formatUsdc(animated)}
      </div>

      {/* Exact value + flash */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span
          className="mono-val"
          style={{ fontSize: 11, color: 'var(--ink-4)' }}
        >
          {value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          USDC
        </span>
        {isFlashing && (
          <span
            className="sys-label"
            style={{ color: 'var(--red)', animation: 'fade-in 0.15s ease-out' }}
          >
            ↑ NEW FAILURE RECORDED
          </span>
        )}
      </div>

      {/* Descriptor */}
      <p
        className="body-text"
        style={{ fontSize: 13, marginTop: 2 }}
      >
        Autonomous agent bounties gone unfulfilled on ARC Testnet
      </p>
    </div>
  );
}
