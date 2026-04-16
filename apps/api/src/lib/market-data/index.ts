import type { MarketSnapshotPayload } from "@market-room/shared";
import type { Env } from "../../index";
import { buildFallbackSnapshot } from "./fallbackSnapshot";
import { createAlphaVantageProvider } from "./providers/alphaVantageProvider";
import { createYahooFinanceProvider } from "./providers/yahooFinanceProvider";
import type { FetchSnapshotContext, MarketDataProvider } from "./types";

export async function fetchLatestMarketSnapshot(
  env: Env,
  prompt: string,
  context: FetchSnapshotContext = {}
): Promise<MarketSnapshotPayload> {
  const provider = createMarketDataProvider(env);
  const now = context.now || new Date().toISOString();

  try {
    return await provider.fetchSnapshot(prompt, {
      ...context,
      now
    });
  } catch {
    return buildFallbackSnapshot(prompt, now, "provider-exception");
  }
}

function createMarketDataProvider(env: Env): MarketDataProvider {
  const providerName = env.MARKET_DATA_PROVIDER || "yahoo_finance";

  if (providerName === "alpha_vantage") {
    return createAlphaVantageProvider({
      apiKey: env.ALPHA_VANTAGE_API_KEY
    });
  }

  if (providerName === "yahoo_finance") {
    return createYahooFinanceProvider();
  }

  return {
    name: "fallback",
    fetchSnapshot: async (prompt: string, context: FetchSnapshotContext = {}) =>
      buildFallbackSnapshot(prompt, new Date().toISOString(), "unknown-provider")
  };
}
