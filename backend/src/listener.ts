import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import { analyzeSpec } from './analyzer.js';
import { fetchSpec } from './ipfs.js';
import { saveJob, hasJobId, getLastScannedBlock, saveLastScannedBlock, saveFailedAnalysis, getFailedAnalyses, deleteFailedAnalysis } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the AgenticCommerce ABI
const ABI_PATH = path.resolve(__dirname, '../../AgenticCommerceABI.json');
const AGENTIC_COMMERCE_ABI = JSON.parse(fs.readFileSync(ABI_PATH, 'utf-8'));

// ─── Pipeline: Process a single job ──────────────────────────────────────────

function isIpfsHash(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.toLowerCase().startsWith('ipfs://')) return true;
  if (trimmed.startsWith('Qm') && trimmed.length === 46) return true;
  if (trimmed.startsWith('bafy') && trimmed.length === 59) return true;
  if (trimmed.includes('/ipfs/')) return true;
  return false;
}

function extractIpfsCid(text: string): string {
  let cleaned = text.trim();
  if (cleaned.toLowerCase().startsWith('ipfs://')) {
    cleaned = cleaned.substring(7);
  }
  if (cleaned.includes('/ipfs/')) {
    const idx = cleaned.indexOf('/ipfs/');
    cleaned = cleaned.substring(idx + 6);
  }
  cleaned = cleaned.split('?')[0].split('/')[0];
  return cleaned;
}

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

  // Fetch real job details from contract
  const jobData = await contract.getJob(jobId);
  
  // Extract budget and format it (assuming 6 decimals USDC)
  const budgetRaw = jobData.budget;
  const bountyAmount = Number(ethers.formatUnits(budgetRaw, 6));
  
  const owner = jobData.client;
  const deadline = Number(jobData.expiredAt);
  const descriptionRaw = jobData.description;

  console.log(`[Listener] 📋 Owner: ${owner} | Budget: $${bountyAmount.toFixed(2)} USDC`);
  console.log(`[Listener] 📄 On-chain Description length: ${descriptionRaw?.length || 0} chars`);

  if (!descriptionRaw || descriptionRaw.trim() === '') {
     console.log(`[Listener] ⚠️  Skipping job ${jId} because description is empty.`);
     return;
  }

  // IPFS Resolving
  let description = descriptionRaw;
  let ipfsHashVal = 'onchain-description';

  if (isIpfsHash(descriptionRaw)) {
    const cid = extractIpfsCid(descriptionRaw);
    console.log(`[Listener] 🌐 Detected IPFS hash/link. Fetching from IPFS: ${cid}...`);
    try {
      const resolvedSpec = await fetchSpec(cid);
      if (resolvedSpec && resolvedSpec.trim() !== '') {
        description = resolvedSpec;
        ipfsHashVal = cid;
        console.log(`[Listener] 📥 Successfully resolved description from IPFS (${description.length} chars).`);
      } else {
        console.warn(`[Listener] ⚠️ IPFS resolution empty for ${cid}. Using raw description.`);
      }
    } catch (ipfsErr) {
      console.warn(`[Listener] ⚠️ IPFS resolution failed for ${cid}. Using raw description. Error:`, ipfsErr);
    }
  }

  // Analyze with Gemini AI
  console.log(`[Listener] ⏳ Waiting 4.5s to respect Gemini API limits...`);
  await new Promise(resolve => setTimeout(resolve, 4500));
  
  console.log(`[Listener] 🤖 Sending to Gemini for analysis...`);
  const analysis = await analyzeSpec(description, bountyAmount);
  console.log(`[Listener] ✅ Analysis: category=${analysis.category} | pain=${analysis.pain_score} | skills=${analysis.missing_skills.join(', ')}`);

  // Save to DB
  await saveJob({
    id: uuidv4(),
    jobId: jId,
    owner,
    bountyAmount,
    deadline,
    rawSpec: description.slice(0, 2000), // store truncated
    ipfsHash: ipfsHashVal,
    reasonCode,
    analysis,
    processedAt: new Date().toISOString(),
    source: 'onchain',
  });

  // Success! Delete from failed_analyses collection if it was there
  await deleteFailedAnalysis(jId);
}

async function retryFailedAnalyses(contract: ethers.Contract): Promise<void> {
  let failedList: any[] = [];
  try {
    failedList = await getFailedAnalyses();
  } catch (err) {
    console.error('[Listener] Error reading failed analyses queue:', err);
    return;
  }

  if (failedList.length === 0) {
    return;
  }

  console.log(`\n[Listener] 🔄 Retrying ${failedList.length} failed jobs in Firestore queue...`);

  for (const failed of failedList) {
    const jId = failed.jobId;
    const retries = failed.retryCount ?? 0;
    
    if (retries >= 5) {
      console.warn(`[Listener] ⚠️ Job ${jId} exceeded max retries (5). Removing from queue.`);
      await deleteFailedAnalysis(jId);
      continue;
    }

    try {
      console.log(`[Listener] 🔄 [Retry ${retries + 1}/5] Processing job ${jId}...`);
      await processFailedJob(contract, BigInt(jId), failed.reasonLabel, failed.reasonCode);
      // Success will automatically delete it from failed_analyses in processFailedJob
    } catch (err: any) {
      console.error(`[Listener] ❌ [Retry ${retries + 1}/5] Job ${jId} failed again:`, err.message || err);
      // Increment retry count and update Firestore
      failed.retryCount = retries + 1;
      failed.failedAt = new Date().toISOString();
      failed.error = err.message || String(err);
      await saveFailedAnalysis(jId, failed);
    }
  }
}

export interface ListenerTelemetry {
  lastScannedBlock: number;
  currentNetworkBlock: number;
  scanProgressPct: number;
  isActive: boolean;
  rpcConnected: boolean;
}

export const telemetry: ListenerTelemetry = {
  lastScannedBlock: 33908011,
  currentNetworkBlock: 33908011,
  scanProgressPct: 0,
  isActive: false,
  rpcConnected: false
};

const START_BLOCK = 33908011;

// ─── Blockchain Listener ──────────────────────────────────────────────────────

export async function startListener(): Promise<void> {
  console.log('[Listener] 🔗 Connecting to Arc Testnet RPC:', config.ARC_RPC_URL);

  telemetry.isActive = true;
  let provider: ethers.JsonRpcProvider;
  try {
    provider = new ethers.JsonRpcProvider(config.ARC_RPC_URL);
    const network = await provider.getNetwork();
    console.log(`[Listener] ✅ Connected to network: chainId=${network.chainId}`);
    telemetry.rpcConnected = true;
  } catch (err) {
    console.warn('[Listener] ⚠️  Cannot connect to Arc Testnet RPC. Listener will run in offline mode.');
    telemetry.rpcConnected = false;
    telemetry.isActive = false;
    return;
  }

  const contract = new ethers.Contract(
    config.JOB_REGISTRY_ADDRESS,
    AGENTIC_COMMERCE_ABI,
    provider
  );

  console.log(`[Listener] 👂 Polling for JobExpired & Refunded events on ${config.JOB_REGISTRY_ADDRESS}`);

  // Scan historical events in batches, and continue polling for live events
  try {
    const BATCH_SIZE = 10000;

    // Query current block height first
    const currentBlockAtStart = await provider.getBlockNumber().catch(() => START_BLOCK);
    telemetry.currentNetworkBlock = currentBlockAtStart;

    // Load last scanned block from Firestore. Use 0 as default to check if empty.
    const dbLastScanned = await getLastScannedBlock(0);
    console.log(`[Listener] 💾 Last scanned block loaded from database: ${dbLastScanned}`);

    // Safety buffer (100 blocks) to check for very recent events without lagging the RPC
    const SAFETY_BUFFER = 100;
    const currentHeadMinSafety = Math.max(0, currentBlockAtStart - SAFETY_BUFFER);

    // Limit active lag to prevent heavy historical crawling (history is already indexed in database)
    const MAX_LAG_ALLOWED = 5000;

    let fromBlock = dbLastScanned;

    if (fromBlock === 0 || (currentBlockAtStart - fromBlock) > MAX_LAG_ALLOWED || process.env.FORCE_SCAN_FROM_HEAD === 'true') {
      if (fromBlock > 0 && process.env.FORCE_SCAN_FROM_HEAD !== 'true') {
        console.log(`[Listener] ℹ️ Stored state (${fromBlock}) lags behind network head by ${currentBlockAtStart - fromBlock} blocks.`);
        console.log(`[Listener] 🚀 Discarding outdated scan state. (History is already collected in the database).`);
      } else if (process.env.FORCE_SCAN_FROM_HEAD === 'true') {
        console.log(`[Listener] ⚡ FORCE_SCAN_FROM_HEAD is active.`);
      } else {
        console.log(`[Listener] ℹ️ No previous scan state found.`);
      }
      fromBlock = currentHeadMinSafety;
      console.log(`[Listener] ⚡ Lock-starting scan near current head at block ${fromBlock} (network head: ${currentBlockAtStart}, buffer: ${SAFETY_BUFFER} blocks).`);
    } else {
      console.log(`[Listener] ✅ Stored state is fresh (lag: ${currentBlockAtStart - fromBlock} blocks). Resuming from block ${fromBlock}.`);
    }

    console.log(`[Listener] 📜 Initiating scan from block ${fromBlock} (Chunks of ${BATCH_SIZE})...`);

    while (true) {
      const currentBlock = await provider.getBlockNumber().catch(() => fromBlock);
      
      telemetry.currentNetworkBlock = currentBlock;
      
      if (fromBlock > currentBlock) {
        const prevBlock = telemetry.lastScannedBlock;
        telemetry.lastScannedBlock = currentBlock;
        telemetry.scanProgressPct = 100;
        
        // Save current block height to database so we start here on reboot
        await saveLastScannedBlock(currentBlock);

        if (currentBlock > prevBlock) {
          console.log(`[Listener] 💓 Active & Monitoring. Block height increased to ${currentBlock}`);
        }

        // We caught up to the network head. Retry failed analyses in queue.
        await retryFailedAnalyses(contract).catch(retryErr => {
          console.error('[Listener] ❌ Error in retryFailedAnalyses:', retryErr);
        });

        // We caught up to the network head. Wait 15 seconds before polling again.
        await new Promise(r => setTimeout(r, 15000));
        continue;
      }

      const toBlock = Math.min(fromBlock + BATCH_SIZE - 1, currentBlock);
      
      telemetry.lastScannedBlock = toBlock;
      const total = currentBlock - START_BLOCK;
      const scanned = toBlock - START_BLOCK;
      telemetry.scanProgressPct = total > 0 ? parseFloat(Math.min((scanned / total) * 100, 100).toFixed(2)) : 100;

      try {
        const expiredFilter = contract.filters.JobExpired();
        const refundedFilter = contract.filters.Refunded();
        const rejectedFilter = contract.filters.JobRejected();
        
        const [expiredEvents, refundedEvents, rejectedEvents] = await Promise.all([
          contract.queryFilter(expiredFilter, fromBlock, toBlock),
          contract.queryFilter(refundedFilter, fromBlock, toBlock),
          contract.queryFilter(rejectedFilter, fromBlock, toBlock)
        ]);
        
        console.log(`[Listener] 🔍 Scanning blocks from ${fromBlock} to ${toBlock}... Found: JobExpired=${expiredEvents.length}, Refunded=${refundedEvents.length}, JobRejected=${rejectedEvents.length}`);

        // Process JobExpired
        if (expiredEvents.length > 0) {
          for (const event of expiredEvents) {
            if ('args' in event && event.args) {
              const jobId = event.args[0] as bigint;
              try {
                await processFailedJob(contract, jobId, 'JobExpired', 2);
              } catch (err: any) {
                console.error(`[Listener] ❌ Error processing job ${jobId.toString()}:`, err);
                await saveFailedAnalysis(jobId.toString(), {
                  jobId: jobId.toString(),
                  reasonLabel: 'JobExpired',
                  reasonCode: 2,
                  failedAt: new Date().toISOString(),
                  error: err.message || String(err),
                  retryCount: 0
                });
              }
            }
          }
        }

        // Process Refunded
        if (refundedEvents.length > 0) {
          for (const event of refundedEvents) {
            if ('args' in event && event.args) {
              const jobId = event.args[0] as bigint;
              try {
                await processFailedJob(contract, jobId, 'Refunded', 1);
              } catch (err: any) {
                console.error(`[Listener] ❌ Error processing job ${jobId.toString()}:`, err);
                await saveFailedAnalysis(jobId.toString(), {
                  jobId: jobId.toString(),
                  reasonLabel: 'Refunded',
                  reasonCode: 1,
                  failedAt: new Date().toISOString(),
                  error: err.message || String(err),
                  retryCount: 0
                });
              }
            }
          }
        }

        // Process JobRejected
        if (rejectedEvents.length > 0) {
          for (const event of rejectedEvents) {
            if ('args' in event && event.args) {
              const jobId = event.args[0] as bigint;
              try {
                await processFailedJob(contract, jobId, 'JobRejected', 3);
              } catch (err: any) {
                console.error(`[Listener] ❌ Error processing job ${jobId.toString()}:`, err);
                await saveFailedAnalysis(jobId.toString(), {
                  jobId: jobId.toString(),
                  reasonLabel: 'JobRejected',
                  reasonCode: 3,
                  failedAt: new Date().toISOString(),
                  error: err.message || String(err),
                  retryCount: 0
                });
              }
            }
          }
        }
        
        // Move to next batch only if successful
        fromBlock += BATCH_SIZE;

        // Persist scanning progress in database
        await saveLastScannedBlock(toBlock);

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
    telemetry.isActive = false;
  }
}
