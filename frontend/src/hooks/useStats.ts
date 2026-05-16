import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface GeminiAnalysis {
  category: 'DeFi' | 'Security' | 'Data-Parsing' | 'Infrastructure';
  missing_skills: string[];
  pain_score: number;
  summary_ua: string;
}

export interface FailedJob {
  id: string;
  jobId: string;
  owner: string;
  bountyAmount: number;
  deadline: number;
  ipfsHash: string;
  reasonCode: number;
  analysis: GeminiAnalysis;
  processedAt: string;
  source: 'onchain' | 'simulator';
}

export interface SkillStat {
  skill: string;
  count: number;
}

export interface Stats {
  totalJobs: number;
  totalUsdcLost: number;
  topSkills: SkillStat[];
  byCategory: Record<string, number>;
  recentJobs: FailedJob[];
}

const EMPTY_STATS: Stats = {
  totalJobs: 0,
  totalUsdcLost: 0,
  topSkills: [],
  byCategory: {},
  recentJobs: [],
};

export function useStats(pollIntervalMs = 3000) {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevTotalRef = useRef<number>(0);
  const [isFlashing, setIsFlashing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get<Stats>(`${API_BASE}/api/stats`, { timeout: 5000 });
      setStats(res.data);
      setIsConnected(true);
      setLastUpdate(new Date());
      setError(null);

      // Flash animation when total changes
      if (res.data.totalUsdcLost !== prevTotalRef.current) {
        prevTotalRef.current = res.data.totalUsdcLost;
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 600);
      }
    } catch (err) {
      setIsConnected(false);
      setError('Cannot reach API. Start the backend server.');
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchStats, pollIntervalMs]);

  return { stats, isConnected, lastUpdate, error, isFlashing };
}
