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
        padding: '24px 0',
        marginBottom: '24px',
      }}
    >
      <div className="container-bento" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, letterSpacing: '-0.05em', color: 'var(--ink)' }}>
            ARC
          </span>
          <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500, color: 'var(--ink-4)', letterSpacing: '-0.01em' }}>
            Unmet Demand
          </span>
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
            gap: 20,
            alignItems: 'start'
          }}
        >
          {/* Top Wide Card: Total Value Lost */}
          <div className="bento-card" style={{ gridColumn: 'span 3', background: '#D8E4D6', color: '#111' }}>
            <LeftOnTableCounter stats={stats} isFlashing={isFlashing} />
          </div>

          {/* Middle Row: Growth Chart and Category Breakdown */}
          <div className="bento-card" style={{ gridColumn: 'span 2', height: 360, background: '#958AAA', color: '#111' }}>
            <TopMissingCapabilities skills={stats.topSkills} />
          </div>
          <div style={{ gridColumn: 'span 1', height: 360 }}>
            <InsightsCards stats={stats} />
          </div>

          {/* Bottom Wide Card: Live Feed */}
          <div className="bento-card" style={{ gridColumn: 'span 3', height: 780, background: 'var(--bg-panel)' }}>
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

