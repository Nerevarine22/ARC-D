import { useState, useEffect } from 'react';
import { useStats } from './hooks/useStats';
import LeftOnTableCounter from './components/LeftOnTableCounter';
import TopMissingCapabilities from './components/TopMissingCapabilities';
import LiveTerminalFeed from './components/LiveTerminalFeed';
import AdminPanel from './components/AdminPanel';
import InsightsCards from './components/InsightsCards';

import Web3ReportButton from './components/Web3ReportButton';
import type { Stats } from './hooks/useStats';

/* ── Top Nav ──────────────────────────────────────────────────── */
function Nav({ stats }: { stats: Stats }) {
  return (
    <header
      style={{
        padding: '32px 0',
        marginBottom: '16px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,10,11,0.8)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
    >
      <div className="container-bento" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--ink)' }}>
            ARC <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>//</span>
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            PROPRIETARY INTELLIGENCE NETWORK
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16 }}>
            <div className="live-dot" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '0.1em' }}>SCANNING...</span>
          </div>
        </div>
        
        <Web3ReportButton stats={stats} />
      </div>
    </header>
  );
}

/* ── App ──────────────────────────────────────────────────────── */
export default function App() {
  const { stats, isConnected, isFlashing, loadMoreJobs } = useStats(3000);
  const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');

  useEffect(() => {
    const h = () => setView(window.location.hash === '#admin' ? 'admin' : 'dashboard');
    window.addEventListener('hashchange', h);
    h();
    return () => window.removeEventListener('hashchange', h);
  }, []);

  if (view === 'admin') return <AdminPanel stats={stats} firestoreConnected={isConnected} />;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingBottom: 64 }}>
      <Nav stats={stats} />

      <main className="container-bento">
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: 32,
            alignItems: 'start'
          }}
        >
          {/* Top Wide Card: Total Value Lost */}
          <div className="bento-card" style={{ gridColumn: 'span 3' }}>
            <LeftOnTableCounter stats={stats} isFlashing={isFlashing} />
          </div>

          {/* Middle Row: Growth Chart and Category Breakdown */}
          <div className="bento-card" style={{ gridColumn: 'span 2', height: 420 }}>
            <TopMissingCapabilities skills={stats.topSkills} />
          </div>
          <div style={{ gridColumn: 'span 1', height: 420 }}>
            <InsightsCards stats={stats} />
          </div>

          {/* Bottom Wide Card: Live Feed */}
          <div className="bento-card" style={{ gridColumn: 'span 3', height: 780 }}>
            <LiveTerminalFeed 
              jobs={stats.recentJobs} 
              onLoadMore={loadMoreJobs}
              hasMore={stats.recentJobs.length < stats.totalJobs}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

