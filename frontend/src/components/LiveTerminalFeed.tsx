import { useEffect, useRef, useState } from 'react';
import type { FailedJob } from '../hooks/useStats';

interface Props { jobs: FailedJob[]; }

const CAT_COLOR: Record<string, string> = {
  DeFi:           'var(--violet)',
  Security:       'var(--red)',
  'Data-Parsing': 'var(--blue)',
  Infrastructure: 'var(--amber)',
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

function PainDots({ score }: { score: number }) {
  const n = Math.round(score);
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          style={{
            width: 4, height: 4, borderRadius: '50%',
            background: i < n ? 'var(--ink)' : 'var(--border)',
          }}
        />
      ))}
    </div>
  );
}

// Archive-style column layout
const COLS = '32px 60px 80px 80px 50px 100px 1fr';

export default function LiveTerminalFeed({ jobs }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string | undefined) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [jobs.length]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Description row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <p className="body-text" style={{ fontSize: 13 }}>
          Live stream of failed agent jobs, classified by category and pain severity.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="live-dot" />
          <span className="sys-label">{jobs.length} EVENTS</span>
          <span
            className="mono-val"
            style={{ fontSize: 10, color: 'var(--green)', animation: 'blink 1.2s step-end infinite' }}
          >
            █
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: COLS,
          gap: '0 16px',
          paddingBottom: 8,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {['#', 'WHEN', 'JOB ID', 'CAUSE', 'USDC', 'CATEGORY', 'SUMMARY & SKILLS'].map((h) => (
          <span key={h} className="sys-label">{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
      >
        {jobs.length === 0 ? (
          <div
            style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
            }}
          >
            <span className="sys-label">Listening for failed agent jobs…</span>
            <span className="mono-val" style={{ fontSize: 12, color: 'var(--ink-5)', animation: 'blink 1.2s step-end infinite' }}>
              █
            </span>
          </div>
        ) : (
          jobs.map((job, idx) => (
            <div
              key={job.id}
              className="archive-row"
              style={{
                display: 'grid',
                gridTemplateColumns: COLS,
                gap: '0 16px',
                padding: '10px 0',
                alignItems: 'start',
                animation: 'row-in 0.22s ease-out both',
                background: idx === 0 ? 'var(--bg-subtle)' : 'transparent',
              }}
            >
              {/* Index */}
              <span className="mono-val" style={{ fontSize: 10, color: 'var(--ink-4)', paddingTop: 2 }}>
                {String(idx + 1).padStart(2, '0')}
              </span>

              {/* When */}
              <span className="mono-val" style={{ fontSize: 10, color: 'var(--ink-4)', paddingTop: 2 }}>
                {timeAgo(job.processedAt)}
              </span>

              {/* Job ID */}
              <button
                onClick={() => handleCopy(job.jobId)}
                style={{
                  background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', textAlign: 'left',
                  fontSize: 10, paddingTop: 2, fontFamily: 'var(--font-mono)',
                  color: copiedId === job.jobId ? 'var(--green)' : 'var(--ink-3)',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { if (copiedId !== job.jobId) e.currentTarget.style.color = 'var(--ink)'; }}
                onMouseLeave={(e) => { if (copiedId !== job.jobId) e.currentTarget.style.color = 'var(--ink-3)'; }}
                title="Click to copy Job ID"
              >
                {copiedId === job.jobId ? 'COPIED' : job.jobId ? `${job.jobId.slice(0, 6)}…` : '—'}
              </button>

              {/* Cause */}
              <span
                className="mono-val"
                style={{
                  fontSize: 10, fontWeight: 500, paddingTop: 2,
                  color: job.reasonCode === 1 ? 'var(--amber)' : 'var(--red)',
                }}
              >
                {REASON[job.reasonCode] ?? 'UNKNOWN'}
              </span>

              {/* Bounty */}
              <span
                className="mono-val tabular-nums"
                style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', paddingTop: 2 }}
              >
                ${job.bountyAmount.toFixed(0)}
              </span>

              {/* Category */}
              <div style={{ paddingTop: 2 }}>
                <span
                  className="cat-pill"
                  style={{ color: CAT_COLOR[job.analysis.category] ?? 'var(--ink-3)' }}
                >
                  {job.analysis.category}
                </span>
              </div>

              {/* Summary */}
              <div>
                <div
                  style={{
                    fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: 5,
                  }}
                >
                  {job.analysis.summary_en}
                </div>
                <PainDots score={job.analysis.pain_score} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                  {job.analysis.missing_skills.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="mono-val"
                      style={{
                        fontSize: 9, color: 'var(--ink-4)',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border)',
                        padding: '1px 5px', borderRadius: 2,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                  {job.analysis.missing_skills.length > 4 && (
                    <span className="mono-val" style={{ fontSize: 9, color: 'var(--ink-5)' }}>
                      +{job.analysis.missing_skills.length - 4}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
