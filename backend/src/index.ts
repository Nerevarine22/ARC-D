import { startApi } from './api.js';
import { startListener } from './listener.js';
import { startSimulator } from './simulator.js';

async function main(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║        ARC MARKET WATCHDOG — Backend Starting        ║');
  console.log('║       Autonomous Agent Demand Aggregator v1.0        ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // Start REST API first (always)
  startApi();

  // Start blockchain listener (may fail gracefully if testnet is offline)
  await startListener();

  // Start demo simulator (always runs for dashboard demo)
  startSimulator();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n[Main] SIGTERM received. Shutting down gracefully...');
    process.exit(0);
  });
}

main().catch(err => {
  console.error('[Main] Fatal error:', err);
  process.exit(1);
});
