import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  isFlashing?: boolean;
}

function formatUsdc(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(2)}K`;
  return `$${val.toFixed(2)}`;
}

function useAnimatedValue(target: number, duration = 600): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = target;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = end;
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

export default function LeftOnTableCounter({ value, isFlashing }: Props) {
  const animatedValue = useAnimatedValue(value);
  const formattedMain = formatUsdc(animatedValue);

  return (
    <div className="card border-glow-green h-full flex flex-col">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="card-label">Total Left on Table</span>
        </div>
        <span className="text-xs font-mono text-text-muted">USDC · All Time</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-4">
        {/* Main counter */}
        <div
          className={`transition-all duration-300 ${isFlashing ? 'scale-105' : 'scale-100'}`}
        >
          <div
            className="font-mono font-bold tabular-nums leading-none text-gradient-green glow-green"
            style={{ fontSize: 'clamp(3rem, 6vw, 5.5rem)' }}
          >
            {formattedMain}
          </div>
        </div>

        {/* Exact value */}
        <div className="font-mono text-sm text-text-secondary tabular-nums">
          {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
        </div>

        {/* Sublabel */}
        <div className="flex flex-col items-center gap-1 mt-2">
          <div className="text-xs font-mono uppercase tracking-widest text-text-muted">
            Autonomous agent bounties
          </div>
          <div className="text-xs font-mono uppercase tracking-widest text-text-muted">
            gone unfulfilled
          </div>
        </div>

        {/* Visual bar */}
        <div className="w-full mt-4 h-px bg-gradient-to-r from-transparent via-status-green to-transparent opacity-30" />

        {/* Flash new entry indicator */}
        {isFlashing && (
          <div className="flex items-center gap-2 animate-pulse">
            <span className="text-xs font-mono text-status-green">▲ NEW FAILURE RECORDED</span>
          </div>
        )}
      </div>
    </div>
  );
}
