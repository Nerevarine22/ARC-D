import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { config } from './config.js';

const app = initializeApp(config.FIREBASE);
const db = getFirestore(app);

async function cleanup() {
  try {
    console.log('Fetching all jobs from Firestore...');
    const snap = await getDocs(collection(db, 'jobs'));
    console.log(`Found ${snap.size} total jobs in Firestore.`);

    let batch = writeBatch(db);
    let deleteCount = 0;
    let keepCount = 0;
    let batchCount = 0;

    let totalLeftOnTable = 0;
    let totalJobs = 0;
    const categories: Record<string, number> = {};
    const skills: Record<string, number> = {};

    for (const d of snap.docs) {
      const job = d.data();
      // Delete any job that is not explicitly 'onchain'
      if (job.source !== 'onchain') {
        batch.delete(d.ref);
        deleteCount++;
        batchCount++;

        if (batchCount === 400) {
          console.log(`Committing delete batch of ${batchCount}...`);
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      } else {
        // Recalculate stats based on ONCHAIN jobs ONLY
        keepCount++;
        totalLeftOnTable += job.bountyAmount || 0;
        totalJobs += 1;

        const cat = job.analysis?.category;
        if (cat) {
          categories[cat] = (categories[cat] || 0) + 1;
        }

        const jobSkills = job.analysis?.missing_skills || [];
        for (const skill of jobSkills) {
          skills[skill] = (skills[skill] || 0) + 1;
        }
      }
    }

    if (batchCount > 0) {
      console.log(`Committing final delete batch of ${batchCount}...`);
      await batch.commit();
    }

    console.log(`Deleted ${deleteCount} simulated/test jobs. Kept ${keepCount} on-chain jobs.`);

    // 2. Re-write global stats
    const statsRef = doc(db, 'analytics', 'global_stats');
    const finalStats = {
      totalLeftOnTable: parseFloat(totalLeftOnTable.toFixed(2)),
      totalJobs,
      categories,
      skills
    };

    await setDoc(statsRef, finalStats);
    console.log('Successfully recalculated and updated global_stats in Firestore!');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanup();
