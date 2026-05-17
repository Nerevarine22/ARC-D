import express from 'express';
import cors from 'cors';
import https from 'https';
import http from 'http';
import { config } from './config.js';
import { getStats, getAllJobs, FailedJob } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const startTime = Date.now();

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Returns system health and uptime info.
 */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/stats
 * Returns aggregated analytics for the dashboard.
 */
app.get('/api/stats', async (_req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    console.error('[API] /api/stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/jobs?limit=50&offset=0
 * Returns paginated job list.
 */
app.get('/api/jobs', async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);
    const offset = parseInt(String(req.query.offset ?? '0'), 10);
    const all = await getAllJobs();
    res.json({
      total: all.length,
      limit,
      offset,
      jobs: all.slice(offset, offset + limit),
    });
  } catch (err) {
    console.error('[API] /api/jobs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/jobs/:id
 * Returns a single job by its internal UUID.
 */
app.get('/api/jobs/:jobId', async (req, res) => {
  try {
    const all = await getAllJobs();
    const job = all.find((j: FailedJob) => j.jobId === req.params.jobId || j.id === req.params.jobId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(job);
  } catch (err) {
    console.error('[API] /api/jobs/:jobId error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Self-pinging mechanism to keep Render free tier awake
function startSelfPinging(): void {
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (!externalUrl) {
    console.log('[API] 💤 RENDER_EXTERNAL_URL is not set. Skipping self-ping.');
    return;
  }

  console.log(`[API] 🔄 Self-pinging enabled for Render Web Service: ${externalUrl}`);

  // Ping every 10 minutes (600,000 ms) to reset Render's sleep timer
  setInterval(() => {
    const pingUrl = `${externalUrl}/api/health`;
    console.log(`[API] 📡 Pinging self at ${pingUrl}...`);

    const client = externalUrl.startsWith('https') ? https : http;
    client.get(pingUrl, (res) => {
      console.log(`[API] 📡 Self-ping response status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error('[API] ❌ Self-ping failed:', err.message);
    });
  }, 10 * 60 * 1000);
}

// ─── Server Bootstrap ─────────────────────────────────────────────────────────

export function startApi(): void {
  app.listen(config.PORT, () => {
    console.log(`[API] 🚀 Server running on http://localhost:${config.PORT}`);
    console.log(`[API]    GET /api/health`);
    console.log(`[API]    GET /api/stats`);
    console.log(`[API]    GET /api/jobs`);

    // Activate Render self-ping
    startSelfPinging();
  });
}
