import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import { fetchSpec } from './ipfs.js';
import { analyzeSpec } from './analyzer.js';
import { saveJob } from './db.js';

// ─── ERC-8183 Human-Readable ABI ─────────────────────────────────────────────

const JOB_REGISTRY_ABI = [
  // Events
  'event JobClosed(uint256 indexed jobId, uint8 indexed reasonCode)',
  'event JobCreated(uint256 indexed jobId, address indexed owner, string ipfsHash, uint256 bountyAmount)',
  // View functions
  'function getJobDetails(uint256 jobId) view returns (address owner, string ipfsHash, uint256 bountyAmount, uint256 deadline, uint8 status)',
  'function getJobCount() view returns (uint256)',
];

const REASON_LABELS: Record<number, string> = {
  0: 'Completed',
  1: 'Cancelled',
  2: 'Expired',
};

// ─── Pipeline: Process a single job ──────────────────────────────────────────

async function processClosedJob(
  contract: ethers.Contract,
  jobId: bigint,
  reasonCode: number
): Promise<void> {
  const label = REASON_LABELS[reasonCode] ?? 'Unknown';
  console.log(`\n[Listener] 🔴 JobClosed | ID: ${jobId} | Reason: ${label} (${reasonCode})`);

  try {
    // Fetch job details from contract
    const details = await contract.getJobDetails(jobId);
    const [owner, ipfsHash, bountyAmountRaw, deadlineRaw, statusRaw] = details;

    // Convert bounty from wei (assuming 6 decimals for USDC)
    const bountyAmount = Number(ethers.formatUnits(bountyAmountRaw, 6));
    const deadline = Number(deadlineRaw);

    console.log(`[Listener] 📋 Owner: ${owner} | Bounty: $${bountyAmount.toFixed(2)} USDC | IPFS: ${ipfsHash}`);

    // Fetch raw spec from IPFS (or mock)
    const rawSpec = await fetchSpec(ipfsHash);
    console.log(`[Listener] 📄 Spec fetched (${rawSpec.length} chars)`);

    // Analyze with Gemini AI
    console.log(`[Listener] 🤖 Sending to Gemini for analysis...`);
    const analysis = await analyzeSpec(rawSpec, bountyAmount);
    console.log(`[Listener] ✅ Analysis: category=${analysis.category} | pain=${analysis.pain_score} | skills=${analysis.missing_skills.join(', ')}`);

    // Save to DB
    saveJob({
      id: uuidv4(),
      jobId: jobId.toString(),
      owner,
      bountyAmount,
      deadline,
      rawSpec: rawSpec.slice(0, 2000), // store truncated
      ipfsHash,
      reasonCode,
      analysis,
      processedAt: new Date().toISOString(),
      source: 'onchain',
    });
  } catch (err) {
    console.error(`[Listener] ❌ Error processing job ${jobId}:`, err);
  }
}

// ─── Blockchain Listener ──────────────────────────────────────────────────────

export async function startListener(): Promise<void> {
  console.log('[Listener] 🔗 Connecting to Arc Testnet RPC:', config.ARC_RPC_URL);

  let provider: ethers.JsonRpcProvider;
  try {
    provider = new ethers.JsonRpcProvider(config.ARC_RPC_URL);
    const network = await provider.getNetwork();
    console.log(`[Listener] ✅ Connected to network: chainId=${network.chainId}`);
  } catch (err) {
    console.warn('[Listener] ⚠️  Cannot connect to Arc Testnet RPC. Listener will run in offline mode.');
    console.warn('[Listener]    Simulator will still provide data for the dashboard.');
    return;
  }

  const contract = new ethers.Contract(
    config.JOB_REGISTRY_ADDRESS,
    JOB_REGISTRY_ABI,
    provider
  );

  // Listen to real-time events
  contract.on('JobClosed', async (jobId: bigint, reasonCode: bigint) => {
    const code = Number(reasonCode);
    // Only process Cancelled (1) and Expired (2)
    if (code === config.REASON_CODES.CANCELLED || code === config.REASON_CODES.EXPIRED) {
      await processClosedJob(contract, jobId, code);
    } else {
      console.log(`[Listener] ℹ️  JobClosed ID=${jobId} reasonCode=${code} (Completed — skipping)`);
    }
  });

  console.log(`[Listener] 👂 Listening for JobClosed events on ${config.JOB_REGISTRY_ADDRESS}`);

  // Also scan recent historical events (last 1000 blocks)
  try {
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000);
    console.log(`[Listener] 📜 Scanning historical events from block ${fromBlock} to ${currentBlock}...`);

    const filter = contract.filters.JobClosed();
    const events = await contract.queryFilter(filter, fromBlock, currentBlock);
    console.log(`[Listener] 📜 Found ${events.length} historical JobClosed events`);

    for (const event of events) {
      if (event instanceof ethers.EventLog) {
        const [jobId, reasonCode] = event.args;
        const code = Number(reasonCode);
        if (code === config.REASON_CODES.CANCELLED || code === config.REASON_CODES.EXPIRED) {
          await processClosedJob(contract, jobId, code);
        }
      }
    }
  } catch (err) {
    console.warn('[Listener] ⚠️  Could not scan historical events:', err);
  }
}
