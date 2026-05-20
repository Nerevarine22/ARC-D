import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, increment, writeBatch, getDocs, getDoc, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { config } from './config.js';

export interface GeminiAnalysis {
  category: 'DeFi' | 'Security' | 'Data-Parsing' | 'Infrastructure';
  missing_skills: string[];
  pain_score: number; // 1–10
  summary_en: string;
}

export interface FailedJob {
  id: string;
  jobId: string;
  owner: string;
  bountyAmount: number; // in USDC (float)
  deadline: number; // unix timestamp
  rawSpec: string;
  ipfsHash: string;
  reasonCode: number; // 1=Cancelled, 2=Expired
  analysis: GeminiAnalysis;
  processedAt: string; // ISO string
  source: 'onchain' | 'simulator';
}

// ─── Initialize Firebase ──────────────────────────────────────────────────────

const app = initializeApp(config.FIREBASE);
const db = getFirestore(app);

// Keep a small cache of processed job IDs to prevent duplicate processing
const processedJobIds = new Set<string>();

export async function initDb(): Promise<void> {
  try {
    const q = query(collection(db, 'jobs'));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const job = d.data() as FailedJob;
      if (job.jobId) processedJobIds.add(job.jobId);
      if (job.id) processedJobIds.add(job.id);
    }
    console.log(`[DB] 🗄️ Cache loaded: ${processedJobIds.size} entries (jobs: ${snap.size})`);
  } catch (err) {
    console.error('[DB] Error loading cache from Firestore:', err);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function hasJobId(jobId: string): boolean {
  return processedJobIds.has(jobId);
}

export async function saveJob(job: FailedJob): Promise<void> {
  if (processedJobIds.has(job.jobId)) return;
  
  processedJobIds.add(job.jobId);
  processedJobIds.add(job.id);

  try {
    const batch = writeBatch(db);

    // 1. Save the job to the jobs collection
    const jobRef = doc(collection(db, 'jobs'), job.id);
    batch.set(jobRef, job);

    // 2. Update the global_stats document in the analytics collection
    const statsRef = doc(db, 'analytics', 'global_stats');
    
    // We update totalLeftOnTable and increment each skill mention
    const statsUpdate: Record<string, any> = {
      totalLeftOnTable: increment(job.bountyAmount),
      totalJobs: increment(1),
      categories: {
        [job.analysis.category]: increment(1)
      },
      skills: {}
    };
    
    for (const skill of job.analysis.missing_skills) {
      statsUpdate.skills[skill] = increment(1);
    }
    
    // Use merge: true so we don't overwrite existing stats
    batch.set(statsRef, statsUpdate, { merge: true });

    await batch.commit();

    console.log(`[DB] Saved job ${job.jobId} to Firestore | $${job.bountyAmount} USDC | pain=${job.analysis.pain_score} | ${job.analysis.category}`);
  } catch (err) {
    console.error('[DB] Save error (Firestore):', err);
    // Remove from cache if save failed so we can retry
    processedJobIds.delete(job.jobId);
    processedJobIds.delete(job.id);
  }
}
export async function getLastScannedBlock(defaultBlock: number): Promise<number> {
  try {
    const docRef = doc(db, 'analytics', 'scanner_state');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (typeof data.lastScannedBlock === 'number') {
        return data.lastScannedBlock;
      }
    }
  } catch (err) {
    console.error('[DB] Error getting lastScannedBlock:', err);
  }
  return defaultBlock;
}

export async function saveLastScannedBlock(blockNumber: number): Promise<void> {
  try {
    const docRef = doc(db, 'analytics', 'scanner_state');
    await setDoc(docRef, { lastScannedBlock: blockNumber }, { merge: true });
  } catch (err) {
    console.error('[DB] Error saving lastScannedBlock:', err);
  }
}

export async function saveFailedAnalysis(jobId: string, metadata: any): Promise<void> {
  try {
    const docRef = doc(db, 'failed_analyses', jobId);
    await setDoc(docRef, metadata, { merge: true });
    console.log(`[DB] 📥 Saved failed analysis metadata for jobId: ${jobId} in Firestore queue.`);
  } catch (err) {
    console.error(`[DB] Error saving failed analysis for jobId ${jobId}:`, err);
  }
}

export async function getFailedAnalyses(): Promise<any[]> {
  try {
    const q = query(collection(db, 'failed_analyses'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  } catch (err) {
    console.error('[DB] Error getting failed analyses queue:', err);
    return [];
  }
}

export async function deleteFailedAnalysis(jobId: string): Promise<void> {
  try {
    const docRef = doc(db, 'failed_analyses', jobId);
    await deleteDoc(docRef);
    console.log(`[DB] 🗑️ Deleted processed jobId ${jobId} from failed analyses queue.`);
  } catch (err) {
    console.error(`[DB] Error deleting failed analysis for jobId ${jobId}:`, err);
  }
}

export async function saveAgentPayout(jobId: string, clientAgent: string, bountyReceived: number, status: string): Promise<void> {
  try {
    const docRef = doc(collection(db, 'agent_payouts'), jobId);
    await setDoc(docRef, {
      jobId,
      clientAgent,
      bountyReceived,
      status,
      timestamp: new Date().toISOString()
    });
    console.log(`[DB] 🟩 Saved agent payout for Job #${jobId}: ${bountyReceived} USDC`);
  } catch (err) {
    console.error(`[DB] Error saving agent payout for jobId ${jobId}:`, err);
  }
}


// We still provide these for backward compatibility with the existing API
// although the frontend will bypass this and read from Firestore directly.

export async function getAllJobs(): Promise<FailedJob[]> {
  try {
    const q = query(collection(db, 'jobs'), orderBy('processedAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as FailedJob);
  } catch (err) {
    console.error('[DB] getAllJobs error:', err);
    return [];
  }
}

export async function getStats() {
  try {
    // 1. Get global stats
    const statsSnap = await getDoc(doc(db, 'analytics', 'global_stats'));
    const statsData = statsSnap.data() || { totalLeftOnTable: 0, skills: {} };
    
    // 2. Transform skills map to sorted array
    const skillsMap: Record<string, number> = statsData.skills || {};
    const topSkills = Object.entries(skillsMap)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // 3. Get recent jobs to calculate categories roughly, or just return an empty/approximate category map
    // (since we aren't maintaining category stats in the batch update above to keep it simple, but we could).
    const recentJobs = await getAllJobs();
    const byCategory: Record<string, number> = {};
    for (const job of recentJobs) {
      byCategory[job.analysis.category] = (byCategory[job.analysis.category] ?? 0) + 1;
    }

    return {
      totalJobs: statsData.totalJobs || recentJobs.length, // totalJobs is optional, or we can add it to statsUpdate
      totalUsdcLost: parseFloat((statsData.totalLeftOnTable || 0).toFixed(2)),
      topSkills,
      byCategory,
      recentJobs,
    };
  } catch (err) {
    console.error('[DB] getStats error:', err);
    return {
      totalJobs: 0,
      totalUsdcLost: 0,
      topSkills: [],
      byCategory: {},
      recentJobs: [],
    };
  }
}
