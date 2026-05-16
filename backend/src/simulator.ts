import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import { generateMockSpec } from './ipfs.js';
import { analyzeSpec } from './analyzer.js';
import { saveJob } from './db.js';

// ─── Realistic Address Generator ─────────────────────────────────────────────

function randomAddress(): string {
  const hex = Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `0x${hex}`;
}

function randomBounty(): number {
  // Distribution: mostly small, some medium, rare large
  const tiers = [
    { min: 50, max: 200, weight: 40 },
    { min: 200, max: 750, weight: 30 },
    { min: 750, max: 2000, weight: 20 },
    { min: 2000, max: 5000, weight: 10 },
  ];
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const tier of tiers) {
    cumulative += tier.weight;
    if (roll < cumulative) {
      return parseFloat((tier.min + Math.random() * (tier.max - tier.min)).toFixed(2));
    }
  }
  return 500;
}

function randomReasonCode(): 1 | 2 {
  return Math.random() < 0.6 ? 2 : 1; // 60% expired, 40% cancelled
}

let simulatorJobCounter = 100000;

// ─── Single Simulation Tick ───────────────────────────────────────────────────

async function simulateTick(): Promise<void> {
  const jobId = (++simulatorJobCounter).toString();
  const bountyAmount = randomBounty();
  const reasonCode = randomReasonCode();
  const owner = randomAddress();
  const ipfsHash = `Qm${uuidv4().replace(/-/g, '')}`;
  const deadline = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400);

  console.log(`\n[Simulator] 🎲 Simulating JobClosed | ID: ${jobId} | $${bountyAmount} USDC | ${reasonCode === 1 ? 'Cancelled' : 'Expired'}`);

  const rawSpec = generateMockSpec();
  console.log(`[Simulator] 📄 Mock spec generated (${rawSpec.length} chars)`);

  console.log(`[Simulator] 🤖 Analyzing with Gemini...`);
  const analysis = await analyzeSpec(rawSpec, bountyAmount);
  console.log(`[Simulator] ✅ ${analysis.category} | pain=${analysis.pain_score} | ${analysis.summary_en.slice(0, 80)}...`);

  saveJob({
    id: uuidv4(),
    jobId,
    owner,
    bountyAmount,
    deadline,
    rawSpec: rawSpec.slice(0, 2000),
    ipfsHash,
    reasonCode,
    analysis,
    processedAt: new Date().toISOString(),
    source: 'simulator',
  });
}

// ─── Simulator Entry Point ────────────────────────────────────────────────────

export function startSimulator(): void {
  console.log(`[Simulator] 🚀 Starting demo simulator (interval: ${config.SIMULATOR_INTERVAL_MS / 1000}s)`);

  // Fire immediately on start for instant dashboard data
  simulateTick().catch(console.error);

  const interval = setInterval(() => {
    simulateTick().catch(console.error);
  }, config.SIMULATOR_INTERVAL_MS);

  // Keep a reference to stop if needed
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('[Simulator] 🛑 Stopped');
  });
}
