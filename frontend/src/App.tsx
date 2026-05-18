import { useState, useEffect } from 'react';
import { useStats } from './hooks/useStats';
import LeftOnTableCounter from './components/LeftOnTableCounter';
import TopMissingCapabilities from './components/TopMissingCapabilities';
import LiveTerminalFeed from './components/LiveTerminalFeed';
import AdminPanel from './components/AdminPanel';
import Web3ReportButton from './components/Web3ReportButton';

function StatusBar({ lastUpdate, totalJobs, error }: {
  lastUpdate: Date | null;
  totalJobs: number;
  error: string | null;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-secondary text-xs font-mono">
      <div className="flex items-center gap-4">
        <span className="text-text-muted">ARC TESTNET</span>
        <span className="text-border-strong">│</span>
        <span className="text-text-muted">JOB_REGISTRY: 0x0747…4583</span>
        <span className="text-border-strong">│</span>
        <span className="text-text-muted">{totalJobs} JOBS PROCESSED</span>
      </div>
      <div className="flex items-center gap-4">
        {error && <span className="text-status-red">{error}</span>}
        <span className="text-text-muted">
          {lastUpdate
            ? `LAST UPDATE: ${lastUpdate.toLocaleTimeString('en-US', { hour12: false })}`
            : 'WAITING...'}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const { stats, isConnected, lastUpdate, error, isFlashing } = useStats(3000);
  const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin') {
        setView('admin');
      } else {
        setView('dashboard');
      }
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  if (view === 'admin') {
    return <AdminPanel stats={stats} firestoreConnected={isConnected} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      {/* ── Top Nav ─────────────────────────────────────────── */}
      <header className="border-b border-border-subtle bg-bg-secondary">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-6 bg-status-red rounded-sm" />
              <div className="w-2 h-4 bg-status-amber rounded-sm" />
              <div className="w-2 h-5 bg-status-green rounded-sm" />
            </div>
            <div>
              <div className="text-sm font-mono font-bold text-text-primary tracking-tight">
                ARC MARKET WATCHDOG
              </div>
              <div className="text-xs font-mono text-text-muted tracking-widest uppercase">
                Autonomous Agent Demand Intelligence
              </div>
            </div>
          </div>

          {/* Center: Key metrics */}
          <div className="hidden md:flex items-center gap-6">
            {[
              { label: 'TOTAL FAILED', value: stats.totalJobs.toString(), color: 'text-status-red' },
              { label: 'AVG BOUNTY', value: stats.totalJobs > 0 ? `$${(stats.totalUsdcLost / stats.totalJobs).toFixed(0)}` : '$0', color: 'text-status-amber' },
              { label: 'TOP SKILL GAP', value: stats.topSkills[0]?.skill ?? '—', color: 'text-cat-defi' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-end">
                <span className="text-xs font-mono text-text-muted uppercase tracking-wider">{label}</span>
                <span className={`text-sm font-mono font-bold tabular-nums ${color}`}>{value}</span>
              </div>
            ))}
          </div>

          {/* Right: badges & payment */}
          <div className="flex items-center gap-4">
            <Web3ReportButton stats={stats} />
            <span className="badge bg-status-red/10 border border-status-red/30 text-status-red text-xs">
              ARC Testnet
            </span>
          </div>
        </div>
      </header>

      {/* ── Status Bar ──────────────────────────────────────── */}
      <StatusBar
        lastUpdate={lastUpdate}
        totalJobs={stats.totalJobs}
        error={error}
      />

      {/* ── Main Dashboard Grid ──────────────────────────────── */}
      <main className="flex-1 p-4 grid gap-4" style={{
        gridTemplateRows: '320px 1fr',
        gridTemplateColumns: '1fr 1fr',
        minHeight: 0,
      }}>
        {/* Row 1, Col 1: Big Counter */}
        <div style={{ gridRow: 1, gridColumn: 1 }}>
          <LeftOnTableCounter value={stats.totalUsdcLost} isFlashing={isFlashing} />
        </div>

        {/* Row 1, Col 2: Skills chart */}
        <div style={{ gridRow: 1, gridColumn: 2 }}>
          <TopMissingCapabilities skills={stats.topSkills} byCategory={stats.byCategory} />
        </div>

        {/* Row 2, Full width: Terminal feed */}
        <div style={{ gridRow: 2, gridColumn: '1 / -1', minHeight: 0 }}>
          <LiveTerminalFeed jobs={stats.recentJobs} />
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-border-subtle px-6 py-2 flex items-center justify-between">
        <span className="text-xs font-mono text-text-muted">
          Arc Market Watchdog v1.0 · ERC-8183 · Arc Testnet · <a href="#admin" className="hover:text-status-red text-text-muted transition-colors font-bold">[ ADMIN CONSOLE ]</a>
        </span>
        <span className="text-xs font-mono text-text-muted">
          Powered by Nerevarin99 · Unmet Demand Analytics
        </span>
      </footer>
    </div>
  );
}
