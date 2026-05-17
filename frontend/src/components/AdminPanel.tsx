import { useState, useEffect } from 'react';
import type { Stats } from '../hooks/useStats';

interface Props {
  stats: Stats;
  firestoreConnected: boolean;
}

interface TelemetryData {
  status: string;
  uptime: number;
  timestamp: string;
  listener: {
    lastScannedBlock: number;
    currentNetworkBlock: number;
    scanProgressPct: number;
    isActive: boolean;
    rpcConnected: boolean;
  };
  gemini: {
    lastCallTime: string | null;
    lastCallStatus: 'success' | 'error' | null;
    totalCalls: number;
    totalErrors: number;
  };
}

export default function AdminPanel({ stats, firestoreConnected }: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const [apiUrl, setApiUrl] = useState(() => {
    return localStorage.getItem('arc_watchdog_api_url') || import.meta.env.VITE_API_URL || 'http://localhost:3001';
  });
  const [isEditingApi, setIsEditingApi] = useState(false);

  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check auth from session storage on mount
  useEffect(() => {
    if (sessionStorage.getItem('arc_admin_authed') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Poll telemetry when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;
    const fetchTelemetry = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${apiUrl}/api/health`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        if (active) {
          setTelemetry(data);
          setTelemetryError(null);
        }
      } catch (err: any) {
        if (active) {
          setTelemetryError(`Failed to fetch backend telemetry: ${err.message}`);
          setTelemetry(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000); // refresh every 5 seconds

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, apiUrl]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'arcwatcher2026';
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('arc_admin_authed', 'true');
      setAuthError(false);
    } else {
      setAuthError(true);
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('arc_admin_authed');
    setPasswordInput('');
    window.location.hash = '';
  };

  const saveCustomApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('arc_watchdog_api_url', apiUrl);
    setIsEditingApi(false);
  };

  const formatUptime = (seconds: number): string => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  const exportTelemetryJson = () => {
    const report = {
      timestamp: new Date().toISOString(),
      apiUrl,
      firestore: {
        connected: firestoreConnected,
        totalJobs: stats.totalJobs,
        totalUsdcLost: stats.totalUsdcLost,
      },
      telemetry,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arc_watchdog_telemetry_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render Login Screen ───────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="w-full max-w-md card bg-bg-card border border-border-default shadow-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-status-red" />
          
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-1">
              <div className="w-2 h-4 bg-status-red rounded-xs animate-pulse" />
              <span className="font-mono text-xs text-status-red tracking-widest font-semibold">SECURITY CORE</span>
            </div>
            <a href="#" className="font-mono text-[10px] text-text-muted hover:text-text-primary transition-colors">
              [ ESCAPE ]
            </a>
          </div>

          <div className="text-center mb-6">
            <h1 className="font-mono font-bold text-lg text-text-primary tracking-tight">ADMIN SECURITY CHECK</h1>
            <p className="font-mono text-xs text-text-muted mt-2">Enter admin authorization key to access telemetry</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-text-secondary uppercase mb-2">ACCESS KEY</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="ENTER SYSTEM PASSWORD..."
                className="w-full bg-bg-secondary border border-border-strong rounded-sm px-3 py-2 font-mono text-sm text-status-green focus:outline-none focus:border-status-red text-center tracking-widest placeholder:text-text-muted/40"
                autoFocus
              />
            </div>

            {authError && (
              <div className="bg-status-red/10 border border-status-red/30 rounded-sm p-3 font-mono text-xs text-status-red text-center">
                🔴 ACCESS DENIED: INVALID SYSTEM KEY.
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-status-red hover:bg-status-red/80 active:scale-[0.98] transition-all text-white font-mono text-xs uppercase py-2.5 rounded-sm font-semibold tracking-wider"
            >
              AUTHENTICATE SESSION
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Render Telemetry Screen ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-border-subtle bg-bg-secondary">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-6 bg-status-red rounded-sm animate-pulse" />
              <div className="w-2 h-4 bg-status-red rounded-sm opacity-60" />
            </div>
            <div>
              <div className="text-sm font-mono font-bold text-text-primary tracking-tight">
                ARC WATCHDOG // SYSTEM TELEMETRY
              </div>
              <div className="text-xs font-mono text-status-red tracking-wider uppercase font-semibold">
                ADMIN CONSOLE
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <button
              onClick={exportTelemetryJson}
              className="badge bg-bg-tertiary hover:bg-bg-hover border border-border-default text-text-secondary text-xs cursor-pointer transition-colors"
            >
              📥 EXPORT LOGS
            </button>
            <a
              href="#"
              className="badge bg-status-green/10 hover:bg-status-green/20 border border-status-green/30 text-status-green text-xs transition-colors"
            >
              [ DASHBOARD ]
            </a>
            <button
              onClick={handleLogout}
              className="badge bg-status-red/10 hover:bg-status-red/20 border border-status-red/30 text-status-red text-xs cursor-pointer transition-colors"
            >
              [ DISCONNECT ]
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
        {/* API Config Override Bar */}
        <div className="card p-4 bg-bg-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="font-mono">
            <div className="text-xs text-text-muted">BACKEND API SERVICE ENDPOINT</div>
            {isEditingApi ? (
              <form onSubmit={saveCustomApiUrl} className="flex gap-2 mt-1.5">
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="bg-bg-secondary border border-border-strong rounded-sm px-2 py-1 text-xs text-status-green focus:outline-none focus:border-border-default font-mono w-[260px]"
                />
                <button
                  type="submit"
                  className="bg-status-green hover:bg-status-green/80 text-white text-xs px-3 rounded-sm font-mono font-bold"
                >
                  SAVE
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingApi(false)}
                  className="bg-bg-tertiary hover:bg-bg-hover text-text-secondary text-xs px-3 rounded-sm font-mono border border-border-default"
                >
                  CANCEL
                </button>
              </form>
            ) : (
              <div className="text-sm font-bold text-text-primary flex items-center gap-2 mt-0.5">
                <span>{apiUrl}</span>
                <button
                  onClick={() => setIsEditingApi(true)}
                  className="text-text-muted hover:text-text-primary text-[10px] uppercase cursor-pointer"
                >
                  [ EDIT ]
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-end font-mono">
              <span className="text-xs text-text-muted">FIRESTORE STREAM</span>
              <span className={`text-sm font-bold ${firestoreConnected ? 'text-status-green' : 'text-status-red'}`}>
                {firestoreConnected ? 'CONNECTED' : 'OFFLINE'}
              </span>
            </div>
            <div className="flex flex-col items-end font-mono border-l border-border-subtle pl-4">
              <span className="text-xs text-text-muted">BACKEND TELEMETRY</span>
              <span className={`text-sm font-bold ${telemetry ? 'text-status-green animate-pulse' : 'text-status-red'}`}>
                {telemetry ? 'ACTIVE' : 'UNREACHABLE'}
              </span>
            </div>
          </div>
        </div>

        {telemetryError && (
          <div className="bg-status-red/10 border border-status-red/30 rounded-sm p-4 font-mono text-xs text-status-red flex items-center justify-between">
            <div>
              <strong>⚠️ MONITORING ERROR:</strong> {telemetryError}
            </div>
            {isLoading && <span className="animate-spin ml-2">⏳</span>}
          </div>
        )}

        {/* Telemetry Core Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1: Backend Daemon Stats */}
          <div className="card flex flex-col h-full">
            <div className="card-header">
              <span className="card-label">BACKEND SERVER CORE</span>
              {isLoading && <span className="font-mono text-xs text-text-muted animate-pulse">POLLING...</span>}
            </div>
            
            <div className="p-4 flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-secondary/40 border border-border-subtle/50 p-3 rounded-sm font-mono">
                  <div className="text-[10px] text-text-muted uppercase">SYSTEM UPTIME</div>
                  <div className="text-sm font-bold text-text-primary mt-1">
                    {telemetry ? formatUptime(telemetry.uptime) : '—'}
                  </div>
                </div>

                <div className="bg-bg-secondary/40 border border-border-subtle/50 p-3 rounded-sm font-mono">
                  <div className="text-[10px] text-text-muted uppercase">HTTP STATUS</div>
                  <div className="text-sm font-bold text-text-primary mt-1 flex items-center gap-1.5">
                    {telemetry ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-status-green animate-ping" />
                        <span className="text-status-green">200 OK</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 rounded-full bg-status-red animate-ping" />
                        <span className="text-status-red">OFFLINE</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-border-subtle/50 pt-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-text-muted">HOST ENVIRONMENT</span>
                  <span className="text-text-primary font-semibold">{telemetry ? 'Render / Linux' : '—'}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-text-muted">BACKEND TIME</span>
                  <span className="text-text-primary">
                    {telemetry ? new Date(telemetry.timestamp).toLocaleString() : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-text-muted">LOCAL SCANNER CACHE</span>
                  <span className="text-text-primary">{stats.totalJobs} jobs cached</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Blockchain Scanner */}
          <div className="card flex flex-col h-full">
            <div className="card-header animate-pulse">
              <span className="card-label">ARC TESTNET BLOCKCHAIN LISTENER</span>
              {telemetry?.listener?.isActive && (
                <span className="badge bg-status-green/10 border border-status-green/30 text-status-green text-[10px]">
                  SCANNING
                </span>
              )}
            </div>
            
            <div className="p-4 flex-1 space-y-4 font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-secondary/40 border border-border-subtle/50 p-3 rounded-sm">
                  <div className="text-[10px] text-text-muted uppercase">RPC CONNECTION</div>
                  <div className="text-sm font-bold mt-1">
                    {telemetry ? (
                      telemetry.listener.rpcConnected ? (
                        <span className="text-status-green">CONNECTED</span>
                      ) : (
                        <span className="text-status-red">DISCONNECTED</span>
                      )
                    ) : (
                      '—'
                    )}
                  </div>
                </div>

                <div className="bg-bg-secondary/40 border border-border-subtle/50 p-3 rounded-sm">
                  <div className="text-[10px] text-text-muted uppercase">SCAN COMPLETION</div>
                  <div className="text-sm font-bold text-text-primary mt-1">
                    {telemetry ? `${telemetry.listener.scanProgressPct}%` : '—'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {telemetry && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>PROGRESS BAR</span>
                    <span>{telemetry.listener.scanProgressPct}%</span>
                  </div>
                  <div className="w-full bg-bg-secondary h-2.5 rounded-sm overflow-hidden border border-border-subtle">
                    <div
                      className="bg-status-red h-full rounded-sm transition-all duration-1000"
                      style={{ width: `${telemetry.listener.scanProgressPct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 border-t border-border-subtle/50 pt-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted">LAST SCANNED BLOCK</span>
                  <span className="text-text-accent font-semibold">
                    {telemetry ? telemetry.listener.lastScannedBlock.toLocaleString() : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted">ARC TESTNET HEAD BLOCK</span>
                  <span className="text-text-primary font-semibold">
                    {telemetry ? telemetry.listener.currentNetworkBlock.toLocaleString() : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted">CONTRACT SCANNING INTERVAL</span>
                  <span className="text-text-primary">START #33908011 → HEAD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Gemini AI Engine */}
          <div className="card flex flex-col h-full md:col-span-2">
            <div className="card-header">
              <span className="card-label">GEMINI AI CLASSIFIER TELEMETRY</span>
              {telemetry?.gemini?.lastCallStatus === 'success' && (
                <span className="badge bg-status-green/10 border border-status-green/30 text-status-green text-[10px]">
                  HEALTHY
                </span>
              )}
            </div>

            <div className="p-4 grid md:grid-cols-3 gap-6 font-mono">
              <div className="space-y-3">
                <div className="bg-bg-secondary/40 border border-border-subtle/50 p-3 rounded-sm">
                  <div className="text-[10px] text-text-muted uppercase">TOTAL CALLS TRIGGERED</div>
                  <div className="text-stat-value text-xl mt-1 text-text-primary">
                    {telemetry ? telemetry.gemini.totalCalls : 0}
                  </div>
                </div>

                <div className="bg-bg-secondary/40 border border-border-subtle/50 p-3 rounded-sm">
                  <div className="text-[10px] text-text-muted uppercase">TOTAL ERRORS RETRIED</div>
                  <div className="text-stat-value text-xl mt-1 text-status-red">
                    {telemetry ? telemetry.gemini.totalErrors : 0}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-bg-secondary/40 border border-border-subtle/50 p-3 rounded-sm">
                  <div className="text-[10px] text-text-muted uppercase">API ERROR RATE</div>
                  <div className="text-stat-value text-xl mt-1 text-text-secondary">
                    {telemetry && telemetry.gemini.totalCalls > 0
                      ? `${((telemetry.gemini.totalErrors / telemetry.gemini.totalCalls) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </div>
                </div>

                <div className="bg-bg-secondary/40 border border-border-subtle/50 p-3 rounded-sm">
                  <div className="text-[10px] text-text-muted uppercase">LAST CALL STATUS</div>
                  <div className="text-sm font-bold mt-1">
                    {telemetry ? (
                      telemetry.gemini.lastCallStatus === 'success' ? (
                        <span className="text-status-green">🟢 SUCCESS</span>
                      ) : telemetry.gemini.lastCallStatus === 'error' ? (
                        <span className="text-status-red">🔴 ERROR / FALLBACK</span>
                      ) : (
                        <span className="text-text-muted">STANDBY / NO CALLS</span>
                      )
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 flex flex-col justify-center border-t md:border-t-0 md:border-l border-border-subtle/50 pt-4 md:pt-0 md:pl-6 text-xs">
                <div className="text-[10px] text-text-muted uppercase mb-1 font-bold">GEMINI RUNTIME INFO</div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">MODEL ABSTRACTION</span>
                  <span className="text-text-primary font-semibold">gemini-3.1-flash-lite</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">RATE LIMIT BUFFER</span>
                  <span className="text-text-primary">4500ms between calls</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">LAST CALL TIME</span>
                  <span className="text-text-primary truncate ml-2 max-w-[160px]">
                    {telemetry && telemetry.gemini.lastCallTime
                      ? new Date(telemetry.gemini.lastCallTime).toLocaleTimeString()
                      : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Small footer */}
      <footer className="border-t border-border-subtle px-6 py-4 flex items-center justify-between text-xs font-mono text-text-muted bg-bg-secondary">
        <span>SECURITY LEVEL: AUTHORIZED OPERATIONS ONLY</span>
        <span>CONSOLE V1.0</span>
      </footer>
    </div>
  );
}
