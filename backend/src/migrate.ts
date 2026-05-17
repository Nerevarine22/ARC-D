import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDoc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import { config } from './config.js';

const app = initializeApp(config.FIREBASE);
const db = getFirestore(app);

async function migrate() {
  try {
    const dbPath = config.DB_PATH;
    if (!fs.existsSync(dbPath)) {
      console.error('db.json not found at', dbPath);
      process.exit(1);
    }

    const rawData = fs.readFileSync(dbPath, 'utf8');
    const jobs = JSON.parse(rawData);
    console.log(`Loaded ${jobs.length} jobs from db.json`);

    // 1. Fetch existing stats to merge
    const statsRef = doc(db, 'analytics', 'global_stats');
    const statsSnap = await getDoc(statsRef);
    
    let totalLeftOnTable = 0;
    let totalJobs = 0;
    const categories: Record<string, number> = {};
    const skills: Record<string, number> = {};

    if (statsSnap.exists()) {
      const data = statsSnap.data();
      totalLeftOnTable = data.totalLeftOnTable || 0;
      totalJobs = data.totalJobs || 0;
      Object.assign(categories, data.categories || {});
      Object.assign(skills, data.skills || {});
      console.log('Found existing stats in Firestore. Merging...');
    }

    // 2. Aggregate from db.json and write jobs
    let batch = writeBatch(db);
    let batchCount = 0;
    let totalMigrated = 0;

    for (const job of jobs) {
      // Aggregate stats
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

      // Add job to batch
      const jobRef = doc(collection(db, 'jobs'), job.id);
      batch.set(jobRef, job);
      batchCount++;
      totalMigrated++;

      if (batchCount === 400) { // Firestore limit is 500
        console.log(`Committing batch of ${batchCount} jobs...`);
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      console.log(`Committing final batch of ${batchCount} jobs...`);
      await batch.commit();
    }

    // 3. Write merged stats
    const finalStats = {
      totalLeftOnTable: parseFloat(totalLeftOnTable.toFixed(2)),
      totalJobs,
      categories,
      skills
    };

    await setDoc(statsRef, finalStats);
    console.log('Successfully wrote global stats to Firestore!');
    console.log(`Migration complete! Migrated ${totalMigrated} jobs.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
