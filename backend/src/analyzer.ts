import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { config } from './config.js';
import type { GeminiAnalysis } from './db.js';

// ─── Gemini Client ────────────────────────────────────────────────────────────

let geminiClient: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    if (!config.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    geminiClient = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return geminiClient;
}

// ─── Response Schema (for structured output) ─────────────────────────────────

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    category: {
      type: SchemaType.STRING,
      enum: ['DeFi', 'Security', 'Data-Parsing', 'Infrastructure'],
      description: 'Primary category of the job specification',
    },
    missing_skills: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'List of specific technical skills that were required but likely unavailable in the market',
    },
    pain_score: {
      type: SchemaType.NUMBER,
      description: 'Market pain score from 1 (trivial) to 10 (extremely rare/specialized)',
    },
    summary_ua: {
      type: SchemaType.STRING,
      description: 'One-sentence summary of the job in Ukrainian language',
    },
  },
  required: ['category', 'missing_skills', 'pain_score', 'summary_ua'],
};

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildPrompt(rawSpec: string, bountyUsdc: number): string {
  return `You are an expert Web3 talent market analyst. An autonomous AI agent job was posted on a blockchain registry with a bounty of ${bountyUsdc.toFixed(2)} USDC, but it FAILED — it was either cancelled by the owner or expired without any agent completing it. This indicates unmet demand in the AI agent marketplace.

Analyze the following job specification and extract structured intelligence about WHY this job likely failed and what skills are missing from the market:

--- JOB SPECIFICATION ---
${rawSpec.slice(0, 4000)}
--- END OF SPECIFICATION ---

Return a JSON object with exactly these fields:
1. "category": Classify into exactly one of: "DeFi", "Security", "Data-Parsing", "Infrastructure"
2. "missing_skills": Array of 3-7 specific technical skills that this job required but that are scarce in the market. Use kebab-case (e.g., "move-lang", "zk-stark-verification", "l3-rollup-parsing", "flashbots-bundle-building")
3. "pain_score": Integer 1-10 representing how rare/specialized these skills are (10 = almost no agents in the market can do this)
4. "summary_ua": Exactly ONE sentence in Ukrainian language summarizing what this job required and why it failed. Be specific about the technology.

Be analytical and precise. Focus on the TECHNICAL SKILLS GAP, not just the topic. Return ONLY valid JSON, no markdown, no explanation.`;
}

// ─── Main Analyzer ────────────────────────────────────────────────────────────

export async function analyzeSpec(
  rawSpec: string,
  bountyUsdc: number
): Promise<GeminiAnalysis> {
  const client = getClient();

  try {
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema as any,
        temperature: 0.3,
        maxOutputTokens: 512,
      },
    });

    const prompt = buildPrompt(rawSpec, bountyUsdc);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const parsed = JSON.parse(text) as GeminiAnalysis;

    // Validate and sanitize
    const validCategories = ['DeFi', 'Security', 'Data-Parsing', 'Infrastructure'];
    if (!validCategories.includes(parsed.category)) {
      parsed.category = 'Infrastructure';
    }
    if (!Array.isArray(parsed.missing_skills) || parsed.missing_skills.length === 0) {
      parsed.missing_skills = ['unspecified-skill'];
    }
    parsed.pain_score = Math.max(1, Math.min(10, Math.round(parsed.pain_score)));
    if (!parsed.summary_ua || typeof parsed.summary_ua !== 'string') {
      parsed.summary_ua = 'Завдання не вдалося виконати через нестачу спеціалізованих навичок на ринку.';
    }

    return parsed;
  } catch (err) {
    console.error('[Gemini] Analysis error:', err);
    // Return deterministic fallback so the pipeline doesn't break
    return buildFallbackAnalysis(rawSpec, bountyUsdc);
  }
}

function buildFallbackAnalysis(rawSpec: string, bountyUsdc: number): GeminiAnalysis {
  const spec = rawSpec.toLowerCase();
  let category: GeminiAnalysis['category'] = 'Infrastructure';
  if (spec.includes('defi') || spec.includes('yield') || spec.includes('liquidity') || spec.includes('arbitrage')) category = 'DeFi';
  else if (spec.includes('audit') || spec.includes('security') || spec.includes('vulnerability') || spec.includes('zk')) category = 'Security';
  else if (spec.includes('pars') || spec.includes('index') || spec.includes('calldata') || spec.includes('rollup')) category = 'Data-Parsing';

  return {
    category,
    missing_skills: ['specialized-onchain-expertise', 'autonomous-agent-development', 'web3-integration'],
    pain_score: bountyUsdc > 2000 ? 8 : bountyUsdc > 500 ? 6 : 4,
    summary_ua: 'Завдання залишилося невиконаним через відсутність агентів з необхідною спеціалізацією в реєстрі.',
  };
}
