import { useEffect, useRef, useState } from 'react';
import type { FailedJob } from '../hooks/useStats';

interface Props {
  jobs: FailedJob[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const CAT_COLOR: Record<string, string> = {
  DeFi:           'var(--bento-purple)',
  Security:       'var(--bento-orange)',
  'Data-Parsing': 'var(--bento-yellow)',
  Infrastructure: 'var(--bento-green)',
};

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

// Minimal bento list columns
const COLS = '40px 70px 90px 100px 70px auto';

export default function LiveTerminalFeed({ jobs, onLoadMore, hasMore }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string | undefined) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Only scroll to top if the first job changes (new job arrived), not when loading older ones.
  const firstJobId = jobs[0]?.id;
  useEffect(() => {
    // scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [firstJobId]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="sys-label solid" style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.1)' }}>
            Live Feed
          </span>
          <span className="sys-label">{jobs.length} EVENTS LOADED</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" style={{ color: 'var(--bento-green)' }} />
          <span className="sys-label" style={{ color: 'var(--bento-green)', border: 'none', padding: 0 }}>LISTENING</span>
        </div>
      </div>

      {/* List Headers */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: COLS, gap: 16,
          padding: '0 16px 12px 16px', borderBottom: '1px solid var(--border)',
          color: 'var(--ink-4)', fontSize: 11, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase'
        }}
      >
        <span>#</span>
        <span>Time</span>
        <span>Job ID</span>
        <span>Category</span>
        <span>USDC</span>
        <span>Summary</span>
      </div>

      {/* List Content */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 8, marginTop: 12 }}>
        {jobs.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="sys-label">Waiting for network events...</span>
          </div>
        ) : (
          <>
            {jobs.map((job, idx) => (
              <div
                key={job.id}
                style={{
                  display: 'grid', gridTemplateColumns: COLS, gap: 16,
                  padding: '16px',
                  alignItems: 'center', animation: 'row-in 0.25s ease-out both',
                  background: idx === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                  borderRadius: 8, transition: 'background 0.2s', cursor: 'default'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = idx === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'}
              >
                {/* Index */}
                <span className="mono-val" style={{ color: 'var(--ink-4)', fontSize: 12 }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>

                {/* Time */}
                <span className="mono-val" style={{ color: 'var(--ink-3)', fontSize: 12 }}>
                  {timeAgo(job.processedAt)}
                </span>

                {/* Job ID */}
                <button
                  onClick={() => handleCopy(job.jobId)}
                  style={{
                    background: 'none', border: 'none', padding: 0, textAlign: 'left',
                    color: copiedId === job.jobId ? 'var(--bento-green)' : 'var(--ink-2)',
                    fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', transition: 'color 0.15s'
                  }}
                >
                  {copiedId === job.jobId ? 'COPIED' : job.jobId ? `${job.jobId.slice(0, 6)}…` : '—'}
                </button>

                {/* Category */}
                <div>
                  <span style={{ 
                    color: '#111', 
                    background: CAT_COLOR[job.analysis.category] ?? 'var(--ink-3)',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    display: 'inline-block'
                  }}>
                    {job.analysis.category}
                  </span>
                </div>

                {/* Bounty */}
                <span className="mono-val" style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
                  ${job.bountyAmount.toFixed(0)}
                </span>

                {/* Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ 
                      color: 'var(--ink-2)', fontSize: 13, whiteSpace: 'nowrap', 
                      overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 
                    }}>
                      {job.analysis.summary_en}
                    </span>
                    
                    {/* Reason Tag */}
                    <span style={{
                      fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
                      color: job.reasonCode === 1 ? 'var(--bento-yellow)' : 'var(--bento-orange)',
                      border: '1px solid currentColor', padding: '2px 6px', borderRadius: 4, flexShrink: 0
                    }}>
                      {REASON[job.reasonCode] ?? 'ERR'}
                    </span>
                  </div>

                  {/* Skills Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {job.analysis.missing_skills.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10, color: 'rgba(255,255,255,0.5)',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          padding: '2px 6px', borderRadius: 4,
                        }}
                      >
                        {s}
                      </span>
                    ))}
                    {job.analysis.missing_skills.length > 3 && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '2px 0' }}>
                        +{job.analysis.missing_skills.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {hasMore && (
              <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={onLoadMore}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    color: 'var(--ink-2)',
                    padding: '8px 24px',
                    borderRadius: 100,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = 'var(--ink-2)';
                  }}
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
