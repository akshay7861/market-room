import { runScheduledMarketCheck } from "./lib/services/scheduledMarketService";
import { handleRequest } from "./routes/router";

export interface Env {
  DB: D1Database;
  AI?: Ai;
  KNOWLEDGE_VECTOR_INDEX?: Vectorize;
  APP_NAME: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GEMINI_PROCESSING_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_PROCESSING_MODEL?: string;
  MARKET_DATA_PROVIDER?: string;
  ALPHA_VANTAGE_API_KEY?: string;
  TWELVE_DATA_API_KEY?: string;
  FRED_API_KEY?: string;
  EIA_API_KEY?: string;
  BEA_API_KEY?: string;
  CENSUS_API_KEY?: string;
  MARKETAUX_API_KEY?: string;
  FINNHUB_API_KEY?: string;
  POLYGON_API_KEY?: string;
  SCHEDULED_DISCUSSIONS_ENABLED?: string;
  SCHEDULED_DISCUSSION_REQUIRE_MATERIALITY?: string;
  SCHEDULED_DISCUSSION_PROMPT?: string;
  SCHEDULED_DISCUSSION_COOLDOWN_MINUTES?: string;
  SCHEDULED_MATERIALITY_INDEX_MOVE_PCT?: string;
  SCHEDULED_MATERIALITY_COMMODITY_MOVE_PCT?: string;
  SCHEDULED_MATERIALITY_DXY_MOVE_PCT?: string;
  SCHEDULED_MATERIALITY_US10Y_BPS?: string;
  SCHEDULED_HEADLINE_CHANGE_COUNT?: string;
  SYNTHESIS_ENABLED?: string;
  SYNTHESIS_EVERY_N_TICKS?: string;
  SYNTHESIS_AGENT_LIMIT?: string;
  ADMIN_API_ENABLED?: string;
  ADMIN_API_TOKEN?: string;
  KNOWLEDGE_VECTOR_RETRIEVAL?: string;
  MARKET_ROOM_DOMAIN_GATE_SUPPRESS?: string;
  RESEND_API_KEY?: string;
  LOOPS_API_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env, ctx);
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledMarketCheck(env, "cron"));
  }
};
