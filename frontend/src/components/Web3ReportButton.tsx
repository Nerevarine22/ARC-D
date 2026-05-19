import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Stats, FailedJob } from '../hooks/useStats';

type ButtonState = 'disconnected' | 'connecting' | 'connected' | 'paying' | 'generating' | 'success' | 'error';

interface Props {
  stats: Stats;
}

const ERC20_ABI = [
  "function transfer(address to, uint256 value) public returns (bool)"
];

export default function Web3ReportButton({ stats }: Props) {
  const [status, setStatus] = useState<ButtonState>('disconnected');
  const [account, setAccount] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper to safely discover and get the injected ethereum provider (handling timing + conflicts)
  const getEthereumProvider = () => {
    if (typeof window === 'undefined') return null;
    const anyWindow = window as any;

    // If multiple providers are injected (e.g. MetaMask + Rabby), some wallets populate window.ethereum.providers
    if (anyWindow.ethereum?.providers?.length) {
      // Prefer MetaMask or Rabby if present, otherwise fallback to the first active provider
      const preferred = anyWindow.ethereum.providers.find((p: any) => p.isMetaMask || p.isRabby);
      if (preferred) return preferred;
      return anyWindow.ethereum.providers[0];
    }

    return anyWindow.ethereum || null;
  };

  // 1. Listen for wallet events and check connection on mount
  useEffect(() => {
    let checkInterval: any = null;
    let isCleanedUp = false;
    let activeProvider: any = null;

    const handleAccounts = (accounts: string[]) => {
      const isDisconnected = localStorage.getItem('wallet_disconnected') === 'true';
      if (accounts.length > 0 && !isDisconnected) {
        setAccount(accounts[0]);
        setStatus('connected');
        setErrorMsg(null);
      } else {
        setAccount(null);
        setStatus('disconnected');
      }
    };

    const initWalletListener = (provider: any) => {
      if (isCleanedUp || !provider) return;
      activeProvider = provider;

      // Subscribe to changes safely
      if (provider.on) {
        provider.on('accountsChanged', handleAccounts);
      }

      // Check current connection
      if (provider.request) {
        provider.request({ method: 'eth_accounts' })
          .then(handleAccounts)
          .catch((err: any) => {
            console.warn('[Web3] Failed to query accounts:', err);
          });
      }
    };

    const checkAndInit = () => {
      const provider = getEthereumProvider();
      if (provider) {
        if (checkInterval) clearInterval(checkInterval);
        initWalletListener(provider);
        return true;
      }
      return false;
    };

    // Try immediately on mount
    if (!checkAndInit()) {
      // Listen for the standard MetaMask initialization event
      const onInitialized = () => {
        checkAndInit();
      };
      window.addEventListener('ethereum#initialized', onInitialized);

      // Defensively poll every 150ms for 2 seconds (13 attempts)
      let attempts = 0;
      checkInterval = setInterval(() => {
        attempts++;
        if (checkAndInit() || attempts >= 13) {
          clearInterval(checkInterval);
        }
      }, 150);
    }

    return () => {
      isCleanedUp = true;
      if (checkInterval) clearInterval(checkInterval);
      window.removeEventListener('ethereum#initialized', () => {});
      if (activeProvider && activeProvider.removeListener) {
        activeProvider.removeListener('accountsChanged', handleAccounts);
      }
    };
  }, []);

  // 2. Connect Wallet
  const connectWallet = async () => {
    const provider = getEthereumProvider();
    if (!provider) {
      setErrorMsg('No Web3 wallet found. Please install or enable MetaMask or Rabby.');
      setStatus('error');
      return;
    }
    try {
      setStatus('connecting');
      setErrorMsg(null);
      if (provider.request) {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          localStorage.removeItem('wallet_disconnected'); // Clear disconnection flag on manual connect
          setAccount(accounts[0]);
          setStatus('connected');
        } else {
          setStatus('disconnected');
        }
      } else {
        throw new Error('Wallet provider does not support RPC requests.');
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setErrorMsg(err.message || 'Connection rejected.');
      setStatus('error');
    }
  };

  // 2.5. Disconnect Wallet (Emulated UI Disconnect)
  const disconnectWallet = () => {
    localStorage.setItem('wallet_disconnected', 'true');
    setAccount(null);
    setStatus('disconnected');
    setErrorMsg(null);
  };

  // 3. Helper to generate Premium PDF Intelligence Report
  const generatePDFReport = (jobs: FailedJob[], txnHash: string) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const drawBackground = () => {
      doc.setFillColor(11, 15, 25); // #0B0F19 deep slate
      doc.rect(0, 0, 210, 297, 'F');
    };

    const drawHeader = (pageNumber: number, tx: string) => {
      // Header Text
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 255, 204); // Neon Green
      doc.text("ARC MARKET WATCHDOG // SYSTEM INTELLIGENCE REPORT", 15, 12);

      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(143, 156, 174); // Muted Grey
      const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const licStr = `LIC: ARC-WD-${tx.slice(2, 10).toUpperCase()}`;
      doc.text(`${dateStr} | ${licStr} | PAGE ${pageNumber}`, 195, 12, { align: 'right' });

      // Neon Green divider line
      doc.setDrawColor(0, 255, 204);
      doc.setLineWidth(0.2);
      doc.line(15, 15, 195, 15);
    };

    const drawFooter = () => {
      // Divider line
      doc.setDrawColor(31, 38, 51);
      doc.setLineWidth(0.2);
      doc.line(15, 282, 195, 282);

      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(143, 156, 174);
      doc.text("CONFIDENTIAL // FOR INTERNAL AGENT AUDIT ONLY", 15, 287);
      doc.text("POWERED BY NEREVARIN99 & GEMINI AI", 195, 287, { align: 'right' });
    };

    // ─── PAGE 1: DASHBOARD SUMMARY ───────────────────────────────────────────
    drawBackground();
    drawHeader(1, txnHash);
    drawFooter();

    // 1. Report Title
    doc.setFont('courier', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("ARC NETWORK AGENT DEMAND & SKILL-GAP INTELLIGENCE", 15, 26);
    
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(143, 156, 174);
    doc.text("Real-time aggregate analytics of failed agent execution blocks on-chain", 15, 32);

    // 2. Executive Summary Cards (Section 1)
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 255, 204);
    doc.text("1.0 // SYSTEM MACRO METRICS", 15, 46);

    const drawCard = (x: number, y: number, w: number, h: number, title: string, value: string, valColor: [number, number, number]) => {
      doc.setFillColor(22, 27, 38); // Midnight Grey
      doc.setDrawColor(31, 38, 51); // Border Grey
      doc.setLineWidth(0.3);
      doc.rect(x, y, w, h, 'FD');

      // Title
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(143, 156, 174);
      doc.text(title, x + 4, y + 5);

      // Value
      doc.setFont('courier', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(valColor[0], valColor[1], valColor[2]);
      doc.text(value, x + 4, y + 12);
    };

    // 3 Cards across the screen (total width = 180mm)
    const formatLost = `$${stats.totalUsdcLost.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC`;
    drawCard(15, 50, 56, 17, "TOTAL USDC LEFT ON TABLE", formatLost, [255, 255, 255]);
    drawCard(77, 50, 56, 17, "ANALYZED EVENT COUNT", `${stats.totalJobs} FAILED JOBS`, [0, 255, 204]);
    drawCard(139, 50, 56, 17, "MARKET EFFICIENCY STATUS", "CRITICAL STATUS [RED]", [255, 51, 102]);

    // 3. Category Distribution (Section 2)
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 255, 204);
    doc.text("2.0 // AGENT FAILURE DISTRIBUTION BY CATEGORY", 15, 79);

    const categories = stats.byCategory || {};
    const totalCatSum = Object.values(categories).reduce((a, b) => a + b, 0) || 1;

    let catY = 85;
    Object.entries(categories).forEach(([category, count]) => {
      const pct = Math.round((count / totalCatSum) * 100);
      const filledBlocks = Math.round(pct / 10);
      const emptyBlocks = 10 - filledBlocks;
      const barStr = `[${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)}]`;

      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(category.padEnd(16), 15, catY);
      
      doc.setTextColor(0, 255, 204);
      doc.text(barStr, 50, catY);

      doc.setTextColor(143, 156, 174);
      doc.text(`${pct}% (${count} events)`, 90, catY);

      catY += 6.5;
    });

    // 4. Top Skill Gaps (Section 3)
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 255, 204);
    doc.text("3.0 // DETECTED AGENT SKILL GAP RANKINGS (ALPHA INTEL)", 15, 126);

    const top5Skills = stats.topSkills.slice(0, 5);
    let skillY = 132;
    
    if (top5Skills.length === 0) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(143, 156, 174);
      doc.text("No skills gap recorded yet. All systems nominal.", 15, skillY);
    } else {
      top5Skills.forEach((skillItem, index) => {
        doc.setFont('courier', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 102, 0); // Neon Orange
        doc.text(`${index + 1}. ${skillItem.skill}`, 15, skillY);

        doc.setFont('courier', 'normal');
        doc.setTextColor(143, 156, 174);
        doc.text(`— blocked ${skillItem.count} transactions`, 125, skillY);

        skillY += 6.5;
      });
    }

    // 5. System Disclosure Warning Box
    const disclosureBoxY = 176;
    doc.setFillColor(22, 27, 38);
    doc.setDrawColor(255, 102, 0); // Warning orange border
    doc.setLineWidth(0.3);
    doc.rect(15, disclosureBoxY, 180, 25, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 102, 0);
    doc.text("SYSTEM DISCLOSURE & ANALYSIS WARNING PROTOCOL:", 19, disclosureBoxY + 6);

    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    const disclosureText = "This intelligence report aggregates failed agent execution blocks on the ARC Testnet registry. The missing capabilities list represents absolute developer bottlenecks. Address these system gaps to capture unfulfilled blockchain bounties.";
    doc.text(disclosureText, 19, disclosureBoxY + 12, { maxWidth: 172 });

    // Seal of Authenticity
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 255, 204);
    doc.text("// ARCHIVE SECURE ACCESS VERIFIED // AUTOMATED BLOCKCHAIN EXPORT //", 15, 222);

    // ─── PAGE 2+: GRANULAR DATA LOGS TABLE ──────────────────────────────────
    doc.addPage();
    
    const tableRows = jobs.map(job => [
      job.jobId || '',
      job.analysis?.category || 'Unknown',
      `$${(job.bountyAmount || 0).toFixed(2)} USDC`,
      job.reasonCode === 1 ? 'Cancelled' : job.reasonCode === 2 ? 'Expired' : job.reasonCode === 3 ? 'Rejected' : 'Unknown',
      new Date(job.processedAt).toISOString().replace('T', ' ').slice(0, 19)
    ]);

    autoTable(doc, {
      startY: 20,
      head: [['Job ID', 'Category', 'Bounty USDC', 'Status', 'Timestamp']],
      body: tableRows,
      theme: 'grid',
      styles: {
        font: 'courier',
        fontSize: 7.5,
        textColor: [255, 255, 255],
        fillColor: [11, 15, 25],
        lineColor: [31, 38, 51],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [22, 27, 38],
        textColor: [0, 255, 204],
        fontStyle: 'bold',
        lineColor: [31, 38, 51],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 32 },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 83 }
      },
      didParseCell: (data) => {
        // Highlight Bounty Column green
        if (data.column.index === 2 && data.section === 'body') {
          data.cell.styles.textColor = [0, 255, 204];
        }
        // Highlight Status values
        if (data.column.index === 3 && data.section === 'body') {
          const text = data.cell.text[0];
          if (text === 'Expired') {
            data.cell.styles.textColor = [255, 102, 0];
          } else if (text === 'Cancelled') {
            data.cell.styles.textColor = [255, 51, 102];
          }
        }
      },
      willDrawPage: () => {
        // Redraw dark background and paginated headers/footers
        drawBackground();
        const globalPage = doc.getNumberOfPages();
        drawHeader(globalPage, txnHash);
        drawFooter();
      },
      margin: { top: 20, bottom: 20 }
    });

    // Download PDF file
    doc.save('ARC_Market_Intelligence_Report.pdf');
  };

  // 4. Process USDC Payment and trigger download
  const triggerPaymentAndDownload = async () => {
    const provider = getEthereumProvider();
    if (!provider) {
      setErrorMsg('No wallet connected.');
      setStatus('error');
      return;
    }
    try {
      setStatus('paying');
      setErrorMsg(null);

      const usdcAddress = import.meta.env.VITE_USDC_ADDRESS;
      const treasuryAddress = import.meta.env.VITE_TREASURY_ADDRESS;

      if (!usdcAddress || !treasuryAddress) {
        throw new Error('USDC Address or Treasury Address not configured.');
      }

      const browserProvider = new ethers.BrowserProvider(provider);
      const signer = await browserProvider.getSigner();

      // Instantiate USDC ERC-20 contract
      const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, signer);

      // 5 USDC = 5,000,000 units (6 decimals)
      const amount = 5_000_000n;

      console.log(`[Web3] Transferring 5 USDC to ${treasuryAddress}`);
      const tx = await usdcContract.transfer(treasuryAddress, amount);
      
      console.log('[Web3] TX Sent:', tx.hash);
      
      // Wait for 1 confirmation
      await tx.wait(1);
      console.log('[Web3] TX Confirmed!');

      // Retrieve all records from Firestore for full logs
      setStatus('generating');
      const jobsCol = collection(db, 'jobs');
      const q = query(jobsCol, orderBy('processedAt', 'desc'));
      const querySnap = await getDocs(q);
      
      const jobs = querySnap.docs.map(doc => doc.data() as FailedJob);

      // Generate Premium PDF intelligence report
      generatePDFReport(jobs, tx.hash);

      setStatus('success');
      setTimeout(() => {
        setStatus('connected');
      }, 4000);

    } catch (err: any) {
      console.error('Monetization flow failed:', err);
      let msg = err.reason || err.message || 'Transaction failed.';
      if (err.code === 'ACTION_REJECTED' || err.message?.includes('user rejected')) {
        msg = 'Transaction rejected by user.';
      }
      setErrorMsg(msg);
      setStatus('error');
    }
  };

  const shortAddress = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : '';

  return (
    <div className="relative flex items-center gap-2 font-mono">
      {/* Account Info Badge */}
      {account && status !== 'disconnected' && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted bg-bg-primary border border-border-subtle px-2 py-1 rounded-sm tracking-tight hidden sm:inline-block">
            🟢 {shortAddress}
          </span>
          <button
            onClick={disconnectWallet}
            className="text-[9px] text-status-red/70 bg-status-red/10 border border-status-red/30 px-2 py-1 rounded-sm hover:bg-status-red hover:text-white transition-all cursor-pointer font-bold uppercase select-none active:scale-[0.97]"
            title="Disconnect Wallet"
          >
            🔌 Disconnect
          </button>
        </div>
      )}

      {/* Primary Action Button */}
      <button
        onClick={status === 'disconnected' ? connectWallet : triggerPaymentAndDownload}
        disabled={status === 'paying' || status === 'generating' || status === 'connecting'}
        className={`px-3 py-1.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 border select-none active:scale-[0.98] cursor-pointer
          ${status === 'disconnected' 
            ? 'bg-status-amber/10 border-status-amber/40 text-status-amber hover:bg-status-amber hover:text-black hover:shadow-[0_0_12px_rgba(245,158,11,0.4)]' 
            : ''
          }
          ${status === 'connecting' 
            ? 'bg-bg-tertiary border-border-default text-text-muted animate-pulse cursor-wait' 
            : ''
          }
          ${status === 'connected' 
            ? 'bg-status-green/10 border-status-green/40 text-status-green hover:bg-status-green hover:text-black hover:shadow-[0_0_12px_rgba(34,197,94,0.4)]' 
            : ''
          }
          ${status === 'paying' 
            ? 'bg-status-red/10 border-status-red/40 text-status-red cursor-wait' 
            : ''
          }
          ${status === 'generating' 
            ? 'bg-status-green/10 border-status-green/40 text-status-green cursor-wait' 
            : ''
          }
          ${status === 'success' 
            ? 'bg-status-green border-status-green text-black font-bold shadow-[0_0_12px_rgba(34,197,94,0.3)]' 
            : ''
          }
          ${status === 'error' 
            ? 'bg-status-red/20 border-status-red text-status-red hover:bg-status-red hover:text-white' 
            : ''
          }
        `}
      >
        {/* State Icons */}
        {status === 'disconnected' && (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )}
        
        {status === 'connecting' && (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}

        {(status === 'connected' || status === 'error') && (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}

        {(status === 'paying' || status === 'generating') && (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}

        {status === 'success' && (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}

        {/* State Label */}
        {status === 'disconnected' && 'Connect Wallet'}
        {status === 'connecting' && 'Connecting...'}
        {status === 'connected' && 'Download Intelligence PDF (5 USDC)'}
        {status === 'paying' && 'Processing Payment in ARC Testnet... ⏳'}
        {status === 'generating' && 'Generating Intelligence Report... 📊'}
        {status === 'success' && 'Download Complete!'}
        {status === 'error' && 'Payment Failed (Retry)'}
      </button>

      {/* Floating Error Tooltip */}
      {errorMsg && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-status-red/95 border border-status-red text-white p-2.5 rounded-sm text-[10px] leading-relaxed shadow-xl z-50">
          <div className="font-bold mb-0.5 flex items-center gap-1">
            <span>⚠️ PAYMENT ERROR</span>
            <button 
              onClick={(e) => { e.stopPropagation(); setErrorMsg(null); }}
              className="ml-auto hover:text-black font-bold uppercase cursor-pointer"
            >
              [X]
            </button>
          </div>
          <p className="font-sans">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
