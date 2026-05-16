import fs from 'fs';
import path from 'path';
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

// ─── In-Memory Store ──────────────────────────────────────────────────────────

const jobs: Map<string, FailedJob> = new Map();
let totalUsdcLost = 0;

// ─── Persistence ─────────────────────────────────────────────────────────────

function loadFromDisk(): void {
  try {
    if (fs.existsSync(config.DB_PATH)) {
      const raw = fs.readFileSync(config.DB_PATH, 'utf-8');
      const parsed: FailedJob[] = JSON.parse(raw);
      for (const job of parsed) {
        jobs.set(job.id, job);
        totalUsdcLost += job.bountyAmount;
      }
      console.log(`[DB] Loaded ${parsed.length} jobs from disk. Total USDC: ${totalUsdcLost.toFixed(2)}`);
    }
  } catch (err) {
    console.warn('[DB] Could not load from disk:', err);
  }
}

function saveToDisk(): void {
  try {
    const arr = Array.from(jobs.values());
    fs.writeFileSync(config.DB_PATH, JSON.stringify(arr, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Save error:', err);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function hasJobId(jobId: string): boolean {
  for (const job of jobs.values()) {
    if (job.jobId === jobId) return true;
  }
  return false;
}

export function saveJob(job: FailedJob): void {
  jobs.set(job.id, job);
  totalUsdcLost += job.bountyAmount;
  saveToDisk();
  console.log(`[DB] Saved job ${job.jobId} | $${job.bountyAmount} USDC | pain=${job.analysis.pain_score} | ${job.analysis.category}`);
}

export function getAllJobs(): FailedJob[] {
  return Array.from(jobs.values()).sort(
    (a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
  );
}

export function getTotalUsdcLost(): number {
  return totalUsdcLost;
}

export function getTopSkills(limit = 15): Array<{ skill: string; count: number }> {
  const freq: Record<string, number> = {};
  for (const job of jobs.values()) {
    for (const skill of job.analysis.missing_skills) {
      freq[skill] = (freq[skill] ?? 0) + 1;
    }
  }
  return Object.entries(freq)
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getStats() {
  const allJobs = getAllJobs();
  const byCategory: Record<string, number> = {};
  for (const job of allJobs) {
    byCategory[job.analysis.category] = (byCategory[job.analysis.category] ?? 0) + 1;
  }
  return {
    totalJobs: jobs.size,
    totalUsdcLost: parseFloat(totalUsdcLost.toFixed(2)),
    topSkills: getTopSkills(),
    byCategory,
    recentJobs: allJobs.slice(0, 50),
  };
}

// Load persisted data on module init
loadFromDisk();
