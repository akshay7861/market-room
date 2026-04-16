import type { MarketSnapshotPayload } from "@market-room/shared";

export type FetchSnapshotContext = {
  previousSnapshot?: MarketSnapshotPayload | null;
  now?: string;
};

export type MarketDataProvider = {
  name: string;
  fetchSnapshot(prompt: string, context?: FetchSnapshotContext): Promise<MarketSnapshotPayload>;
};
