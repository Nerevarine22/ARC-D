import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import { analyzeSpec } from './analyzer.js';
import { saveJob, hasJobId } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the AgenticCommerce ABI
const ABI_PATH = path.resolve(__dirname, '../../AgenticCommerceABI.json');
const AGENTIC_COMMERCE_ABI = JSON.parse(fs.readFileSync(ABI_PATH, 'utf-8'));

// ─── Pipeline: Process a single job ──────────────────────────────────────────

async function processFailedJob(
  contract: ethers.Contract,
  jobId: bigint,
  reasonLabel: string,
  reasonCode: number
): Promise<void> {
  const jId = jobId.toString();
  if (hasJobId(jId)) {
    return;
  }
  
  console.log(`\n[Listener] 🔴 ${reasonLabel} | ID: ${jId}`);

  try {
    // Fetch real job details from contract
    const jobData = await contract.getJob(jobId);
    
    // Extract budget and format it (assuming 6 decimals USDC)
    const budgetRaw = jobData.budget;
    const bountyAmount = Number(ethers.formatUnits(budgetRaw, 6));
    
    const owner = jobData.client;
    const deadline = Number(jobData.expiredAt);
    const description = jobData.description;

    console.log(`[Listener] 📋 Owner: ${owner} | Budget: $${bountyAmount.toFixed(2)} USDC`);
    console.log(`[Listener] 📄 Description length: ${description.length} chars`);

    if (!description || description.trim() === '') {
       console.log(`[Listener] ⚠️  Skipping job ${jId} because description is empty.`);
       return;
    }

    // Analyze with Gemini AI
    console.log(`[Listener] 🤖 Sending to Gemini for analysis...`);
    const analysis = await analyzeSpec(description, bountyAmount);
    console.log(`[Listener] ✅ Analysis: category=${analysis.category} | pain=${analysis.pain_score} | skills=${analysis.missing_skills.join(', ')}`);

    // Save to DB
    saveJob({
      id: uuidv4(),
      jobId: jId,
      owner,
      bountyAmount,
      deadline,
      rawSpec: description.slice(0, 2000), // store truncated
      ipfsHash: 'onchain-description', // no IPFS anymore, data is in string
      reasonCode,
      analysis,
      processedAt: new Date().toISOString(),
      source: 'onchain',
    });
  } catch (err) {
    console.error(`[Listener] ❌ Error processing job ${jId}:`, err);
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
    return;
  }

  const contract = new ethers.Contract(
    config.JOB_REGISTRY_ADDRESS,
    AGENTIC_COMMERCE_ABI,
    provider
  );

  // Listen to live events
  contract.on('JobExpired', async (jobId: bigint) => {
    await processFailedJob(contract, jobId, 'JobExpired', 2);
  });

  contract.on('Refunded', async (jobId: bigint, client: string, amount: bigint) => {
    await processFailedJob(contract, jobId, 'Refunded', 1);
  });

  console.log(`[Listener] 👂 Listening for JobExpired & Refunded events on ${config.JOB_REGISTRY_ADDRESS}`);

  // Scan historical events in batches
  try {
    const currentBlock = await provider.getBlockNumber();
    const START_BLOCK = 33908011;
    const BATCH_SIZE = 4000;

    console.log(`[Listener] 📜 Initiating deep scan from block ${START_BLOCK} to ${currentBlock} (Chunks of ${BATCH_SIZE})...`);

    let fromBlock = START_BLOCK;
    while (fromBlock <= currentBlock) {
      const toBlock = Math.min(fromBlock + BATCH_SIZE - 1, currentBlock);
      
      try {
        const expiredFilter = contract.filters.JobExpired();
        const refundedFilter = contract.filters.Refunded();
        
        const [expiredEvents, refundedEvents] = await Promise.all([
          contract.queryFilter(expiredFilter, fromBlock, toBlock),
          contract.queryFilter(refundedFilter, fromBlock, toBlock)
        ]);
        
        console.log(`[Listener] 🔍 Scanning blocks from ${fromBlock} to ${toBlock}... Found: JobExpired=${expiredEvents.length}, Refunded=${refundedEvents.length}`);

        // Process JobExpired
        if (expiredEvents.length > 0) {
          for (const event of expiredEvents) {
            if (event instanceof ethers.EventLog) {
              const jobId = event.args[0] as bigint;
              await processFailedJob(contract, jobId, 'JobExpired', 2);
            }
          }
        }

        // Process Refunded
        if (refundedEvents.length > 0) {
          for (const event of refundedEvents) {
            if (event instanceof ethers.EventLog) {
              const jobId = event.args[0] as bigint;
              await processFailedJob(contract, jobId, 'Refunded', 1);
            }
          }
        }
        
        // Move to next batch only if successful
        fromBlock += BATCH_SIZE;

        // Small delay between successful chunks to be polite to the RPC
        await new Promise(r => setTimeout(r, 500));

      } catch (err: any) {
        console.warn(`[Listener] ⚠️  RPC Error range ${fromBlock}-${toBlock}: ${err.message?.substring(0, 100)}. Retrying in 2s...`);
        // If it fails, wait 2 seconds and retry the SAME batch
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    console.log(`[Listener] 📜 Deep scan completed.`);
  } catch (err) {
    console.warn('[Listener] ⚠️  Could not initiate deep scan:', err);
  }
}
