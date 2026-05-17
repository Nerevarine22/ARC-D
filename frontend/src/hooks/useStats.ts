import { useState, useEffect, useRef } from 'react';
import { collection, doc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface GeminiAnalysis {
  category: 'DeFi' | 'Security' | 'Data-Parsing' | 'Infrastructure';
  missing_skills: string[];
  pain_score: number;
  summary_en: string;
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

export function useStats(_pollIntervalMs = 3000) { // Keep arg for compat, though unused
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevTotalRef = useRef<number>(0);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    // We will merge data from two listeners
    let currentStats = { ...EMPTY_STATS };

    const updateState = () => {
      setStats({ ...currentStats });
      setIsConnected(true);
      setLastUpdate(new Date());
      setError(null);

      if (currentStats.totalUsdcLost !== prevTotalRef.current) {
        prevTotalRef.current = currentStats.totalUsdcLost;
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 600);
      }
    };

    const unsubscribeStats = onSnapshot(doc(db, 'analytics', 'global_stats'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        currentStats.totalUsdcLost = parseFloat((data.totalLeftOnTable || 0).toFixed(2));
        currentStats.totalJobs = data.totalJobs || 0;
        currentStats.byCategory = data.categories || {};
        
        const skillsMap: Record<string, number> = data.skills || {};
        currentStats.topSkills = Object.entries(skillsMap)
          .map(([skill, count]) => ({ skill, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 15);
          
        updateState();
      }
    }, (err) => {
      console.error("Firestore global_stats error:", err);
      setError('Cannot connect to Firebase.');
      setIsConnected(false);
    });

    const q = query(collection(db, 'jobs'), orderBy('processedAt', 'desc'), limit(50));
    const unsubscribeJobs = onSnapshot(q, (querySnap) => {
      const jobs = querySnap.docs.map(d => d.data() as FailedJob);
      currentStats.recentJobs = jobs;
      updateState();
    }, (err) => {
      console.error("Firestore jobs error:", err);
      setError('Cannot connect to Firebase.');
      setIsConnected(false);
    });

    return () => {
      unsubscribeStats();
      unsubscribeJobs();
    };
  }, []);

  return { stats, isConnected, lastUpdate, error, isFlashing };
}
