import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

// Initialize firebase admin using the default credentials
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (e) {
  console.error("Could not read serviceAccountKey.json:", e);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore();

async function testFirebase() {
  console.log("Testing Firebase connection and quota...");
  try {
    const snap = await db.collection('jobs').limit(1).get();
    console.log(`Success! Fetched ${snap.size} documents.`);
  } catch (error: any) {
    console.error("Firebase Error:");
    console.error(error.message);
    if (error.code) {
      console.error("Error Code:", error.code);
    }
  }
}

testFirebase();
