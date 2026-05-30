import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Stats, FailedJob } from '../hooks/useStats';

type ButtonState =
  | 'disconnected' | 'connecting' | 'connected'
  | 'paying' | 'generating' | 'success' | 'error';

interface Props { stats: Stats; }

const ERC20_ABI = [
  'function transfer(address to, uint256 value) public returns (bool)',
];

/* ── Editorial button base ───────────────────────────────────── */
const BTN_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  height: 28,
  padding: '0 12px',
  border: '1px solid var(--border)',
  borderRadius: 2,
  background: 'transparent',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'var(--ink-3)',
  cursor: 'pointer',
  transition: 'background 0.12s, border-color 0.12s, color 0.12s',
  whiteSpace: 'nowrap' as const,
  userSelect: 'none' as const,
  outline: 'none',
};

/* ── Spinner ─────────────────────────────────────────────────── */
function Spinner() {
  return (
    <svg
      width="10" height="10"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

/* ── Icon: download ──────────────────────────────────────────── */
function DownloadIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/* ── Icon: link/connect ──────────────────────────────────────── */
function LinkIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export default function Web3ReportButton({ stats: _stats }: Props) {
  const stats = _stats; // used inside generatePDFReport
  const [status, setStatus] = useState<ButtonState>('disconnected');
  const [account, setAccount] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [announcedProviders, setAnnouncedProviders] = useState<any[]>([]);
  const [hasStandardEthereum, setHasStandardEthereum] = useState(false);
  const providersRef = useRef<any[]>([]);

  const getEthereumProvider = () => {
    if (typeof window === 'undefined') return null;
    const w = window as any;
    if (providersRef.current.length > 0) {
      const preferred = providersRef.current.find(
        (p: any) => p.info.name.toLowerCase().includes('rabby') || p.info.name.toLowerCase().includes('metamask')
      );
      return preferred ? preferred.provider : providersRef.current[0].provider;
    }
    if (w.rabby) return w.rabby;
    if (w.phantom?.ethereum) return w.phantom.ethereum;
    if (w.okxwallet) return w.okxwallet;
    if (w.ethereum?.providers?.length) {
      const preferred = w.ethereum.providers.find((p: any) => p.isMetaMask || p.isRabby);
      return preferred ?? w.ethereum.providers[0];
    }
    return w.ethereum || null;
  };

  useEffect(() => {
    let checkInterval: any = null;
    let isCleanedUp = false;
    let activeProvider: any = null;

    if (typeof window !== 'undefined' && (window as any).ethereum) setHasStandardEthereum(true);

    const handleAccounts = (accounts: string[]) => {
      const wasDisconnected = localStorage.getItem('wallet_disconnected') === 'true';
      if (accounts.length > 0 && !wasDisconnected) {
        setAccount(accounts[0]); setStatus('connected'); setErrorMsg(null);
      } else {
        setAccount(null); setStatus('disconnected');
      }
    };

    const initWalletListener = (provider: any) => {
      if (isCleanedUp || !provider) return;
      if (activeProvider && activeProvider !== provider && activeProvider.removeListener) {
        activeProvider.removeListener('accountsChanged', handleAccounts);
      }
      activeProvider = provider;
      if (provider.on) provider.on('accountsChanged', handleAccounts);
      if (provider.request) {
        provider.request({ method: 'eth_accounts' })
          .then(handleAccounts)
          .catch((e: any) => console.warn('[Web3]', e));
      }
    };

    const checkAndInit = () => {
      const p = getEthereumProvider();
      if (p) { initWalletListener(p); return true; }
      return false;
    };

    const handleAnnounce = (event: any) => {
      const d = event.detail;
      if (!d?.provider) return;
      if (providersRef.current.some(p => p.info.uuid === d.info.uuid)) return;
      const updated = [...providersRef.current, d];
      providersRef.current = updated;
      setAnnouncedProviders(updated);
      checkAndInit();
    };

    window.addEventListener('eip6963:announceProvider', handleAnnounce as any);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    window.addEventListener('ethereum#initialized', checkAndInit);
    checkAndInit();

    let attempts = 0;
    checkInterval = setInterval(() => {
      attempts++;
      checkAndInit();
      if (attempts >= 13) clearInterval(checkInterval);
    }, 150);

    return () => {
      isCleanedUp = true;
      if (checkInterval) clearInterval(checkInterval);
      window.removeEventListener('ethereum#initialized', checkAndInit);
      window.removeEventListener('eip6963:announceProvider', handleAnnounce as any);
      if (activeProvider?.removeListener) activeProvider.removeListener('accountsChanged', handleAccounts);
    };
  }, []);

  const connectWallet = async () => {
    const provider = getEthereumProvider();
    if (!provider) { setErrorMsg('No Web3 wallet found. Install MetaMask or Rabby.'); setStatus('error'); return; }
    try {
      setStatus('connecting'); setErrorMsg(null);
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        localStorage.removeItem('wallet_disconnected');
        setAccount(accounts[0]); setStatus('connected');
      } else { setStatus('disconnected'); }
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection rejected.'); setStatus('error');
    }
  };

  const disconnectWallet = () => {
    localStorage.setItem('wallet_disconnected', 'true');
    setAccount(null); setStatus('disconnected'); setErrorMsg(null);
  };

  const generatePDFReport = (jobs: FailedJob[], txnHash: string) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const drawBg = () => { doc.setFillColor(11, 15, 25); doc.rect(0, 0, 210, 297, 'F'); };
    const drawHeader = (page: number, tx: string) => {
      doc.setFont('courier', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 255, 204);
      doc.text('ARC MARKET WATCHDOG // SYSTEM INTELLIGENCE REPORT', 15, 12);
      doc.setFont('courier', 'normal'); doc.setFontSize(7); doc.setTextColor(143, 156, 174);
      doc.text(`${new Date().toISOString().slice(0, 19)} | LIC: ARC-WD-${tx.slice(2, 10).toUpperCase()} | PAGE ${page}`, 195, 12, { align: 'right' });
      doc.setDrawColor(0, 255, 204); doc.setLineWidth(0.2); doc.line(15, 15, 195, 15);
    };
    const drawFooter = () => {
      doc.setDrawColor(31, 38, 51); doc.setLineWidth(0.2); doc.line(15, 282, 195, 282);
      doc.setFont('courier', 'normal'); doc.setFontSize(7); doc.setTextColor(143, 156, 174);
      doc.text('CONFIDENTIAL // FOR INTERNAL AGENT AUDIT ONLY', 15, 287);
      doc.text('POWERED BY NEREVARIN99 & GEMINI AI', 195, 287, { align: 'right' });
    };

    drawBg(); drawHeader(1, txnHash); drawFooter();
    doc.setFont('courier', 'bold'); doc.setFontSize(14); doc.setTextColor(255, 255, 255);
    doc.text('ARC NETWORK AGENT DEMAND & SKILL-GAP INTELLIGENCE', 15, 26);

    autoTable(doc, {
      startY: 40,
      head: [['Job ID', 'Category', 'Bounty USDC', 'Status', 'Timestamp']],
      body: jobs.map(job => [
        job.jobId || '',
        job.analysis?.category || 'Unknown',
        `$${(job.bountyAmount || 0).toFixed(2)} USDC`,
        job.reasonCode === 1 ? 'Cancelled' : job.reasonCode === 2 ? 'Expired' : 'Rejected',
        new Date(job.processedAt).toISOString().replace('T', ' ').slice(0, 19),
      ]),
      theme: 'grid',
      styles: { font: 'courier', fontSize: 7.5, textColor: [255, 255, 255], fillColor: [11, 15, 25], lineColor: [31, 38, 51], lineWidth: 0.1 },
      headStyles: { fillColor: [22, 27, 38], textColor: [0, 255, 204], fontStyle: 'bold' },
      willDrawPage: () => { drawBg(); drawHeader(doc.getNumberOfPages(), txnHash); drawFooter(); },
      margin: { top: 20, bottom: 20 },
    });

    doc.save('ARC_Market_Intelligence_Report.pdf');
  };

  const triggerPaymentAndDownload = async () => {
    const provider = getEthereumProvider();
    if (!provider) { setErrorMsg('No wallet connected.'); setStatus('error'); return; }
    try {
      setStatus('paying'); setErrorMsg(null);
      const usdcAddress   = import.meta.env.VITE_USDC_ADDRESS     || '0x3600000000000000000000000000000000000000';
      const treasuryAddress = import.meta.env.VITE_TREASURY_ADDRESS || '0x43675dd92a75e03c6da7cffc6d6960a5d0096abd';
      const browserProvider = new ethers.BrowserProvider(provider);
      const signer = await browserProvider.getSigner();
      const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
      const tx = await usdcContract.transfer(treasuryAddress, 5_000_000n);
      await tx.wait(1);
      setStatus('generating');
      const snap = await getDocs(query(collection(db, 'jobs'), orderBy('processedAt', 'desc')));
      generatePDFReport(snap.docs.map(d => d.data() as FailedJob), tx.hash);
      setStatus('success');
      setTimeout(() => setStatus('connected'), 4000);
    } catch (err: any) {
      let msg = err.reason || err.message || 'Transaction failed.';
      if (err.code === 'ACTION_REJECTED' || msg.includes('user rejected')) msg = 'Transaction rejected.';
      setErrorMsg(msg); setStatus('error');
    }
  };

  const shortAddress = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : '';
  const isBusy = status === 'paying' || status === 'generating' || status === 'connecting';

  /* ── Determine labels ─────────────────────────────── */
  const connectLabel =
    status === 'connecting' ? 'Connecting…'
    : status === 'error'   ? 'Retry Connect'
    : 'Connect Wallet';

  const downloadLabel =
    status === 'paying'     ? 'Processing…'
    : status === 'generating' ? 'Generating…'
    : status === 'success'    ? 'Downloaded ✓'
    : status === 'error'      ? 'Retry'
    : 'Download Report · 5 USDC';

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>

      {/* ── Connected: address chip ── */}
      {account && (
        <>
          <div
            style={{
              ...BTN_BASE,
              cursor: 'default',
              color: 'var(--ink-2)',
              letterSpacing: '0.04em',
              fontSize: 10,
            }}
          >
            {shortAddress}
          </div>
          <button
            onClick={disconnectWallet}
            style={BTN_BASE}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-subtle)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)';
            }}
          >
            Disconnect
          </button>
        </>
      )}

      {/* ── Connect / Download button ── */}
      <button
        onClick={!account ? connectWallet : triggerPaymentAndDownload}
        disabled={isBusy}
        style={{
          ...BTN_BASE,
          borderColor: account && status !== 'error' ? 'var(--ink)' : 'var(--border)',
          color: account && status !== 'error' ? 'var(--ink)' : 'var(--ink-3)',
          opacity: isBusy ? 0.6 : 1,
          cursor: isBusy ? 'wait' : 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!isBusy) {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--ink)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--bg)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ink)';
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = account && status !== 'error' ? 'var(--ink)' : 'var(--ink-3)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = account && status !== 'error' ? 'var(--ink)' : 'var(--border)';
        }}
      >
        {isBusy
          ? <Spinner />
          : account
            ? <DownloadIcon />
            : <LinkIcon />
        }
        {account ? downloadLabel : connectLabel}
      </button>

      {/* ── Wallet hint ── */}
      {!account && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--ink-4)',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}
        >
          {announcedProviders.length > 0
            ? announcedProviders.map(p => p.info.name).join(', ')
            : hasStandardEthereum ? 'Web3 detected' : 'No wallet detected'}
        </div>
      )}

      {/* ── Error tooltip ── */}
      {errorMsg && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 8,
            width: 260,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-strong)',
            borderRadius: 2,
            padding: '10px 12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            zIndex: 100,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <span className="sys-label" style={{ color: 'var(--red)' }}>
              {account ? 'PAYMENT ERROR' : 'CONNECTION ERROR'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setErrorMsg(null); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--ink-4)',
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            {errorMsg}
          </p>
        </div>
      )}
    </div>
  );
}
