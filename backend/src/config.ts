import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  ARC_RPC_URL: requireEnv('ARC_TESTNET_RPC_URL', 'https://rpc.testnet.arc.io'),
  JOB_REGISTRY_ADDRESS: requireEnv(
    'JOB_REGISTRY_ADDRESS',
    '0x0747EEf0706327138c69792bF28Cd525089e4583'
  ),
  VALIDATION_REGISTRY_ADDRESS: requireEnv(
    'VALIDATION_REGISTRY_ADDRESS',
    '0x0000000000000000000000000000000000000000'
  ),
  GEMINI_API_KEY: requireEnv('GEMINI_API_KEY', ''),
  PORT: parseInt(process.env.PORT ?? '3001', 10),
  DB_PATH: path.resolve(__dirname, '../../db.json'),
  SIMULATOR_INTERVAL_MS: parseInt(process.env.SIMULATOR_INTERVAL_MS ?? '15000', 10),
  // ReasonCode mapping per ERC-8183
  REASON_CODES: {
    COMPLETED: 0,
    CANCELLED: 1,
    EXPIRED: 2,
  } as const,
  FIREBASE: {
    apiKey: requireEnv('FIREBASE_API_KEY'),
    authDomain: requireEnv('FIREBASE_AUTH_DOMAIN'),
    projectId: requireEnv('FIREBASE_PROJECT_ID'),
    storageBucket: requireEnv('FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: requireEnv('FIREBASE_MESSAGING_SENDER_ID'),
    appId: requireEnv('FIREBASE_APP_ID'),
    measurementId: requireEnv('FIREBASE_MEASUREMENT_ID', ''),
  }
} as const;

export type Config = typeof config;
