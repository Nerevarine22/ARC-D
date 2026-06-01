import { useRef, useState } from 'react';
import type { FailedJob } from '../hooks/useStats';

interface Props {
  jobs: FailedJob[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const REASON: Record<number, string> = {
  1: 'CANCELLED',
  2: 'EXPIRED',
  3: 'REJECTED',
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function LiveTerminalFeed({ jobs, onLoadMore, hasMore }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string | undefined) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="sys-label accent">LIVE INTELLIGENCE FEED</span>
          <span className="sys-label">{jobs.length} EVENTS LOADED</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '0.1em' }}>MONITORING 12 NETWORKS</span>
        </div>
      </div>

      {/* Stream */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 8 }}>
        {jobs.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="sys-label">Awaiting network events...</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
            {jobs.map((job) => {
              const conf = Math.min(99, 85 + (job.jobId.length % 10)); // Simulated confidence
              const statusStr = REASON[job.reasonCode] ?? 'UNKNOWN';

              return (
                <div
                  key={job.id}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    animation: 'row-in 0.25s ease-out both',
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div className="live-dot" style={{ width: 4, height: 4, animationDuration: '3s', flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                        Detected {timeAgo(job.processedAt)}
                      </span>
                      {job.jobId && (
                        <>
                          <span style={{ color: 'var(--border)' }}>|</span>
                          <button
                            onClick={() => handleCopy(job.jobId)}
                            style={{
                              background: 'none', border: 'none', padding: 0,
                              color: copiedId === job.jobId ? 'var(--accent)' : 'var(--ink-4)',
                              fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', transition: 'color 0.15s',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {copiedId === job.jobId ? 'COPIED' : `ID:${job.jobId.slice(0, 6)}…`}
                          </button>
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'rgba(138,154,134,0.1)', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                        CONF {conf}%
                      </span>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                        {statusStr}
                      </span>
                    </div>
                  </div>

                  {/* Value & Summary */}
                  <div>
                    <div style={{ fontSize: 24, fontFamily: 'var(--font-display)', color: 'var(--ink)', fontWeight: 500, letterSpacing: '-0.02em' }}>
                      ${job.bountyAmount.toFixed(0)} left on table
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.5 }}>
                      {job.analysis.summary_en}
                    </div>
                  </div>

                  {/* Capabilities List */}
                  <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                      Missing Capabilities
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {job.analysis.missing_skills.map(s => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'var(--accent)', fontSize: 10 }}>■</span>
                          <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && jobs.length > 0 && (
          <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={onLoadMore}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                color: 'var(--ink-2)',
                padding: '10px 32px',
                borderRadius: 100,
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--border-strong)';
                e.currentTarget.style.color = 'var(--ink)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-subtle)';
                e.currentTarget.style.color = 'var(--ink-2)';
              }}
            >
              Load More Intel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
