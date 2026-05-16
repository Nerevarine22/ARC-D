// ─── IPFS Fetcher + Mock Spec Generator ──────────────────────────────────────
// Tries to fetch raw text from IPFS gateway; falls back to realistic mock specs.

const IPFS_GATEWAYS = [
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
];

const MOCK_SPECS: string[] = [
  `Title: Build a Move-lang Smart Contract Auditor Agent
Description: We need an autonomous AI agent that can parse and audit Move-language smart contracts on the Aptos and Sui blockchains. The agent must detect reentrancy patterns, integer overflow vulnerabilities, and unauthorized capability transfers. It should produce a structured JSON report with severity ratings (Critical/High/Medium/Low) and remediation suggestions. The agent should integrate with our existing CI/CD pipeline via a REST API. Expected throughput: 50 contracts/hour. Output must be deterministic and reproducible.
Requirements: Deep knowledge of Move language semantics, familiarity with Aptos/Sui VM internals, ability to parse bytecode if source is unavailable, output SARIF-compatible JSON.
Budget: Negotiable based on performance benchmarks.`,

  `Title: L3 Rollup Data Parsing and Indexing Agent
Description: Autonomous agent required to parse transaction data from a custom L3 rollup chain that uses a proprietary compression format (LZ4 + custom RLP encoding). The agent must decode calldata, identify contract interactions, build a normalized event log, and push data to a PostgreSQL database in real-time. Latency requirement: under 200ms per block. The rollup produces ~500 TPS during peak hours. Must handle chain reorganizations gracefully and maintain a reorg-aware state machine.
Requirements: Strong experience with EVM internals and custom RLP encoding, experience with rollup architectures (Arbitrum Orbit preferred), ability to handle data integrity issues.`,

  `Title: Cross-Chain DeFi Arbitrage Monitoring Agent
Description: We need an agent that monitors price discrepancies across 12 DEXs simultaneously (Uniswap v3, Curve, Balancer, PancakeSwap, GMX, Hyperliquid, etc.) across 6 chains (Ethereum, Arbitrum, Base, Optimism, Polygon, BSC). The agent must calculate gas-adjusted profit margins in real-time, flag arbitrage opportunities exceeding 0.3% net margin, and send alerts via Telegram webhook within 50ms of detection. Must maintain WebSocket connections to all chains simultaneously without connection drops.
Requirements: Expert knowledge of AMM mathematics, multi-chain RPC management, low-latency WebSocket handling, MEV protection strategies.`,

  `Title: ZK Proof Verification Automation Agent
Description: Build an agent that automates the verification of zk-SNARK and zk-STARK proofs submitted to our verification contract. The agent needs to: (1) monitor the submission queue, (2) validate proof format before on-chain submission to save gas, (3) batch verify proofs using recursive aggregation where possible, (4) report verification costs and success rates. Must support Groth16, PLONK, and FRI-based proof systems. Integration with Circom and Noir proof systems is required.
Requirements: Cryptography background, Halo2 or Plonky2 experience, gas optimization expertise.`,

  `Title: On-Chain Governance Risk Scoring Agent
Description: Autonomous agent to score DAO governance proposals for risk before voting closes. The agent must: (1) parse proposal calldata to understand exact on-chain effects, (2) simulate execution using a mainnet fork, (3) score risk across dimensions: TVL impact, admin key exposure, oracle dependency, upgrade authority changes, (4) publish risk report to IPFS and reference it in a governance forum post via API. Must handle Compound Governor, OpenZeppelin Governor, and Snapshot off-chain voting.
Requirements: DAO governance expertise, Foundry/Anvil simulation, IPFS publishing, forum API integration.`,

  `Title: Real-Time MEV Bundle Builder for Flashbots
Description: We need an AI agent that analyzes the public mempool and constructs optimal MEV bundles for submission to Flashbots. The agent must: identify sandwich attack opportunities (ethically bounded to >$10k targets only), construct and simulate bundles locally, calculate optimal bribe amounts, and submit bundles with <100ms latency from detection to submission. Must maintain a historical database of MEV strategies and their success rates for continuous learning.
Requirements: Deep Flashbots API knowledge, mempool monitoring expertise, Solidity simulation, statistical modeling of gas prices.`,

  `Title: DeFi Liquidation Bot with Dynamic Capital Allocation
Description: Build an autonomous liquidation agent for Aave v3, Compound v3, and MorphoBlue protocols. The agent must: monitor undercollateralized positions across all three protocols simultaneously, calculate optimal liquidation amounts accounting for flash loan costs, dynamically allocate capital between protocols based on expected profit margins, and execute liquidations atomically. Must handle cases where the liquidation itself affects the collateral price (large liquidations). Target: $2M+ monthly liquidation volume.
Requirements: Expert Aave/Compound/Morpho knowledge, flash loan arbitrage, real-time price impact modeling, capital efficiency optimization.`,

  `Title: Smart Contract Formal Verification Agent
Description: We need an agent that applies formal verification techniques to Solidity smart contracts. The agent should: (1) parse Solidity AST to extract invariants and pre/post conditions, (2) translate these to Dafny or Coq specifications, (3) attempt automated proof generation, (4) where automated proofs fail, generate human-readable verification summaries. Integration with Certora Prover API and Halmos symbolic testing framework is required. The agent must produce audit-ready documentation.
Requirements: Formal methods background, Certora Prover, symbolic execution, Solidity expertise.`,

  `Title: Cross-Protocol Yield Optimizer with Gas Optimization
Description: Autonomous agent to maximize yield on idle USDC/USDT/DAI holdings across: Aave, Compound, Yearn, Convex, Pendle, and EigenLayer. The agent must: (1) calculate net APY after gas costs for every rebalancing action, (2) only rebalance when net gain exceeds threshold (configurable, default 0.5% APY improvement), (3) handle LST/LRT positions and their associated unstaking delays, (4) produce daily performance reports. Must use EIP-7702 batching to minimize gas costs. Target deployment: $50M TVL.
Requirements: DeFi yield mechanics, EIP-7702 batching, LST protocol expertise, gas optimization.`,

  `Title: AI-Powered Smart Contract Upgrade Safety Agent
Description: Build an agent that validates smart contract upgrades before proxy pattern implementations are executed. The agent must: (1) diff storage layouts between implementation versions to detect collisions, (2) verify that function selectors don't conflict, (3) simulate the upgrade on a forked chain and run a full test suite, (4) check that new logic doesn't introduce centralization risks, (5) generate a human-readable upgrade impact report. Must support UUPS, Transparent, and Diamond proxy patterns. Integration with OpenZeppelin Upgrades plugin required.
Requirements: Proxy pattern expertise, storage layout analysis, Foundry simulation, OpenZeppelin Upgrades.`,
];

export async function fetchSpec(ipfsHash: string): Promise<string> {
  if (!ipfsHash || ipfsHash.length < 10) {
    return generateMockSpec();
  }

  // Try each IPFS gateway with a short timeout
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const url = `${gateway}${ipfsHash}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const text = await res.text();
        if (text.length > 20) return text;
      }
    } catch {
      // Try next gateway
    }
  }

  // Fallback to mock
  console.warn(`[IPFS] Could not fetch ${ipfsHash}, using mock spec`);
  return generateMockSpec();
}

export function generateMockSpec(): string {
  const idx = Math.floor(Math.random() * MOCK_SPECS.length);
  return MOCK_SPECS[idx];
}

export function getMockSpecByIndex(idx: number): string {
  return MOCK_SPECS[idx % MOCK_SPECS.length];
}
