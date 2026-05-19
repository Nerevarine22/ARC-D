import { useEffect, useRef } from 'react';
import type { FailedJob } from '../hooks/useStats';

interface Props {
  jobs: FailedJob[];
}

const CATEGORY_BADGE: Record<string, string> = {
  DeFi: 'badge-defi',
  Security: 'badge-security',
  'Data-Parsing': 'badge-parsing',
  Infrastructure: 'badge-infra',
};

const REASON_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: 'CANCELLED', color: 'text-status-amber' },
  2: { label: 'EXPIRED', color: 'text-status-red' },
  3: { label: 'REJECTED', color: 'text-status-red' },
};

function PainBar({ score }: { score: number }) {
  const filled = Math.round(score);
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 w-1 rounded-sm ${
            i < filled
              ? filled >= 8
                ? 'bg-status-red'
                : filled >= 5
                ? 'bg-status-amber'
                : 'bg-status-green'
              : 'bg-border-default'
          }`}
        />
      ))}
      <span className="ml-1 font-mono text-xs text-text-secondary">{score}/10</span>
    </div>
  );
}

function truncateAddr(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function timeAgo(isoStr: string): string {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function LiveTerminalFeed({ jobs }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new jobs come in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [jobs.length]);

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="card-label">Live Terminal Feed</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-muted">{jobs.length} events</span>
          <span className="text-xs font-mono text-status-green animate-blink">█</span>
        </div>
      </div>

      {/* Terminal header bar */}
      <div className="grid grid-cols-[85px_75px_120px_90px_1fr] gap-4 px-4 py-1.5 border-b border-border-subtle bg-bg-secondary">
        {['CAUSE', 'JOB ID', 'CATEGORY', 'PAIN', 'SUMMARY'].map((h) => (
          <div key={h} className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider truncate">
            {h}
          </div>
        ))}
      </div>

      {/* Scrollable feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 min-h-0"
        style={{ maxHeight: '100%' }}
      >
        {jobs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="font-mono text-xs text-text-muted animate-pulse">
                Listening for failed agent jobs...
              </div>
              <div className="font-mono text-xs text-text-muted opacity-50">
                <span className="animate-blink">█</span>
              </div>
            </div>
          </div>
        ) : (
          jobs.map((job, idx) => {
            const reason = REASON_LABEL[job.reasonCode] ?? { label: 'UNKNOWN', color: 'text-text-muted' };
            const isNew = idx === 0;
            return (
              <div
                key={job.id}
                className={`terminal-row ${isNew ? 'bg-bg-hover/30' : ''}`}
              >
                {/* Time / Cause */}
                <div className="text-text-muted">
                  <div>{timeAgo(job.processedAt)}</div>
                  <div className={`text-xs ${reason.color}`}>{reason.label}</div>
                </div>

                {/* Job ID + owner */}
                <div>
                  <div className="text-text-accent">#{job.jobId}</div>
                  <div className="text-text-muted text-xs">{truncateAddr(job.owner)}</div>
                </div>

                {/* Category */}
                <div>
                  <span className={CATEGORY_BADGE[job.analysis.category] ?? 'badge bg-bg-tertiary text-text-muted border border-border-default'}>
                    {job.analysis.category}
                  </span>
                  <div className="mt-1 text-text-muted">
                    ${job.bountyAmount.toFixed(0)} USDC
                  </div>
                </div>

                {/* Pain score */}
                <div>
                  <PainBar score={job.analysis.pain_score} />
                  <div className="text-text-muted text-xs mt-1">
                    {job.source === 'simulator' ? '⚡ sim' : ''}
                  </div>
                </div>

                {/* Summary */}
                <div className="min-w-0">
                  <div className="text-text-primary leading-tight line-clamp-2">
                    {job.analysis.summary_en}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {job.analysis.missing_skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="text-xs font-mono text-text-muted bg-bg-secondary border border-border-subtle px-1 rounded-sm">
                        {skill}
                      </span>
                    ))}
                    {job.analysis.missing_skills.length > 3 && (
                      <span className="text-xs font-mono text-text-muted">
                        +{job.analysis.missing_skills.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
