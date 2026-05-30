import { useState, useEffect, useRef } from 'react';
import { useStats } from './hooks/useStats';
import type { Stats } from './hooks/useStats';
import LeftOnTableCounter from './components/LeftOnTableCounter';
import TopMissingCapabilities from './components/TopMissingCapabilities';
import LiveTerminalFeed from './components/LiveTerminalFeed';
import AdminPanel from './components/AdminPanel';
import Web3ReportButton from './components/Web3ReportButton';
import InsightsCards from './components/InsightsCards';

/* ── Scroll-reveal hook ───────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && e.target.classList.add('visible'),
      { threshold: 0.06 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── Top Nav ──────────────────────────────────────────────────── */
function Nav({ stats }: { stats: Stats }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(250,250,248,0.97)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* ROW 1 — wordmark */}
      <div
        className="container-ed"
        style={{ height: 48, display: 'flex', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              fontWeight: 900,
              letterSpacing: '-0.05em',
              color: 'var(--ink)',
              lineHeight: 1,
            }}
          >
            ARC
          </span>
          <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              fontWeight: 400,
              color: 'var(--ink-3)',
              letterSpacing: '-0.01em',
            }}
          >
            Unmet
          </span>
        </div>
      </div>

      {/* ROW 2 — nav links + Web3 button */}
      <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
        <div
          className="container-ed"
          style={{
            height: 36,
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'space-between',
          }}
        >
          <nav style={{ display: 'flex', alignItems: 'stretch' }}>
            {[
              { label: 'Database',     href: '#database-feed' },
              { label: 'Taxonomy',     href: '#taxonomy' },
              { label: 'Statistics',   href: '#statistics' },
              { label: 'Intelligence', href: '#database' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-4)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                  borderRight: '1px solid var(--border)',
                  transition: 'color 0.12s, background 0.12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--ink)';
                  e.currentTarget.style.background = 'var(--bg-subtle)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--ink-4)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {label}
              </a>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Web3ReportButton stats={stats} />
          </div>
        </div>
      </div>
    </header>
  );
}

/* ── Hero ─────────────────────────────────────────────────────── */
function Hero({ stats, isFlashing }: { stats: Stats; isFlashing: boolean }) {
  const ref = useReveal();
  return (
    <section ref={ref} className="reveal" style={{ padding: '80px 0 64px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 64, alignItems: 'start' }}>
        <div>
          <LeftOnTableCounter value={stats.totalUsdcLost} isFlashing={isFlashing} />

          <div className="sec-eyebrow" style={{ marginTop: 40, marginBottom: 16 }}>
            Autonomous Agent Demand Intelligence
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--ink)', maxWidth: 640, marginBottom: 20 }}>
            Unmet Demand in
            the Agent Economy
          </h1>
          <p className="body-text" style={{ fontSize: 14, maxWidth: 520, marginBottom: 0 }}>
            Real-time intelligence on where autonomous AI agents fail
            to fulfill work on the ARC network — tracking skill gaps,
            missed bounties, and unmet economic demand.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', paddingLeft: 48, minWidth: 180 }}>
          {[
            { label: 'Failed Jobs',    value: stats.totalJobs.toLocaleString() },
            { label: 'Skills Tracked', value: stats.topSkills.length.toString() },
            {
              label: 'Avg. Bounty',
              value: stats.totalJobs > 0
                ? `$${(stats.totalUsdcLost / stats.totalJobs).toFixed(0)}`
                : '$—',
            },
            {
              label: 'Top Category',
              value: Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—',
            },
          ].map(({ label, value }, i, arr) => (
            <div
              key={label}
              style={{
                paddingBottom: i < arr.length - 1 ? 24 : 0,
                marginBottom:  i < arr.length - 1 ? 24 : 0,
                borderBottom:  i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div className="sys-label" style={{ marginBottom: 6 }}>{label}</div>
              <div className="metric-num" style={{ fontSize: 'clamp(22px, 2.5vw, 32px)' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Stats strip ──────────────────────────────────────────────── */
function StatsStrip({ stats }: { stats: Stats }) {
  const total = Object.values(stats.byCategory).reduce((s, v) => s + v, 0) || 1;
  const cats = [
    { name: 'DeFi',     key: 'DeFi' },
    { name: 'Security', key: 'Security' },
    { name: 'Data',     key: 'Data-Parsing' },
    { name: 'Infra',    key: 'Infrastructure' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      {cats.map(({ name, key }, i, arr) => {
        const count = stats.byCategory[key] ?? 0;
        const pct   = ((count / total) * 100).toFixed(0);
        return (
          <div key={key} style={{ padding: '40px 0', paddingLeft: i === 0 ? 0 : 32, borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div className="metric-num" style={{ fontSize: 'clamp(48px, 6vw, 80px)' }}>{pct}%</div>
            <div className="sys-label" style={{ marginTop: 8 }}>{name} Failures</div>
            <div className="body-text" style={{ fontSize: 13, marginTop: 4 }}>{count.toLocaleString()} jobs</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Section ──────────────────────────────────────────────────── */
function Section({ index, label, children, py = 64, id }: {
  index: string; label: string; children: React.ReactNode; py?: number; id?: string;
}) {
  const ref = useReveal();
  return (
    <>
      <hr className="section-sep" />
      <section id={id} ref={ref} className="reveal" style={{ padding: `${py}px 0` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <span className="sec-index">{index}</span>
          <div style={{ width: 1, height: 10, background: 'var(--border)' }} />
          <span className="sec-eyebrow">{label}</span>
        </div>
        {children}
      </section>
    </>
  );
}

/* ── Mission ──────────────────────────────────────────────────── */
function MissionStatement() {
  const ref = useReveal();
  return (
    <>
      <hr className="section-sep" />
      <section ref={ref} className="reveal" style={{ padding: '80px 0 100px', textAlign: 'center' }}>
        <div className="sec-eyebrow" style={{ marginBottom: 32 }}>MISSION</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 56px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05, color: 'var(--ink)', maxWidth: 780, margin: '0 auto 32px' }}>
          AI AGENTS WILL NOT IMPROVE
          <br />
          IF WE ONLY TRACK SUCCESS.
        </h2>
        <p className="body-text" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          ARCD documents where the agent economy breaks down —
          one failed job at a time. Every unmet bounty is a signal.
          Every missing skill is a market gap.
        </p>
      </section>
    </>
  );
}

/* ── Footer ───────────────────────────────────────────────────── */
function Footer({ error }: { error: string | null }) {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
      <div className="container-ed" style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="sys-label">
          ARC MARKET WATCHDOG · v1.0 · ERC-8183
          {error && <span style={{ color: 'var(--red)', marginLeft: 12 }}>⚠ {error}</span>}
        </span>
        <span className="sys-label">POWERED BY NEREVARIN99 · UNMET DEMAND ANALYTICS</span>
      </div>
    </footer>
  );
}

/* ── App ──────────────────────────────────────────────────────── */
export default function App() {
  const { stats, isConnected, lastUpdate, error, isFlashing } = useStats(3000);
  const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');

  // suppress unused-var warnings — keep props for future use
  void isConnected; void lastUpdate;

  useEffect(() => {
    const h = () => setView(window.location.hash === '#admin' ? 'admin' : 'dashboard');
    window.addEventListener('hashchange', h);
    h();
    return () => window.removeEventListener('hashchange', h);
  }, []);

  if (view === 'admin') return <AdminPanel stats={stats} firestoreConnected={isConnected} />;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <Nav stats={stats} />

      <main className="container-ed">
        <Hero stats={stats} isFlashing={isFlashing} />

        <Section index="01" label="Failure Taxonomy" id="taxonomy" py={56}>
          <StatsStrip stats={stats} />
        </Section>

        <Section index="02" label="Skill Gap Analysis" id="database" py={56}>
          <div style={{ height: 440 }}>
            <TopMissingCapabilities skills={stats.topSkills} byCategory={stats.byCategory} />
          </div>
        </Section>

        <Section index="03" label="Live Failure Archive" id="database-feed" py={56}>
          <div style={{ height: 840 }}>
            <LiveTerminalFeed jobs={stats.recentJobs} />
          </div>
        </Section>

        <Section index="04" label="Intelligence Overview" id="statistics" py={56}>
          <InsightsCards stats={stats} />
        </Section>

        <MissionStatement />
      </main>

      <Footer error={error} />
    </div>
  );
}
