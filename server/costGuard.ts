import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const USAGE_FILE = process.env.USAGE_FILE ?? "data/usage.json";
const SPEND_LIMIT_USD = Number(process.env.SPEND_LIMIT_USD ?? 10);

// Preise in USD pro 1 Million Tokens (Anthropic-Preisliste, Stand 2026).
const PRICING_PER_MILLION: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 2.0, output: 10.0 },
  "claude-opus-5": { input: 5.0, output: 25.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 }
};
const DEFAULT_PRICING = PRICING_PER_MILLION["claude-sonnet-5"];

interface UsageState {
  spentUsd: number;
}

function readState(): UsageState {
  if (!existsSync(USAGE_FILE)) return { spentUsd: 0 };
  try {
    const raw = JSON.parse(readFileSync(USAGE_FILE, "utf-8")) as Partial<UsageState>;
    return { spentUsd: raw.spentUsd ?? 0 };
  } catch {
    return { spentUsd: 0 };
  }
}

function writeState(state: UsageState): void {
  mkdirSync(dirname(USAGE_FILE), { recursive: true });
  writeFileSync(USAGE_FILE, JSON.stringify(state));
}

export function getSpentUsd(): number {
  return readState().spentUsd;
}

export function getSpendLimitUsd(): number {
  return SPEND_LIMIT_USD;
}

/**
 * Weicher Schutz auf App-Ebene, kein Ersatz für das harte Limit in der
 * Anthropic Console (Settings -> Billing -> Limits). Diese Prüfung schätzt
 * Kosten anhand der Token-Nutzung und ist bei parallelen Requests nicht
 * race-condition-sicher – reicht aber, um ein Team vor versehentlicher
 * Dauernutzung nach Erreichen des Budgets zu bewahren.
 */
export function assertBudgetAvailable(): void {
  const spent = getSpentUsd();
  if (spent >= SPEND_LIMIT_USD) {
    throw new Error(
      `Claude-Vision-Budget von $${SPEND_LIMIT_USD.toFixed(2)} erreicht (aktuell ca. $${spent.toFixed(
        2
      )} verbraucht). Erkennung ist pausiert. Admin kann SPEND_LIMIT_USD erhöhen oder data/usage.json zurücksetzen.`
    );
  }
}

export function recordUsage(model: string, inputTokens: number, outputTokens: number): void {
  const pricing = PRICING_PER_MILLION[model] ?? DEFAULT_PRICING;
  const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;

  const state = readState();
  state.spentUsd += cost;
  writeState(state);
}
