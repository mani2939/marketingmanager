/** Extension contracts only. No provider is connected or invoked by the scaffold. */
import type { WorkspaceId } from "./workspaces";
import type { ContentItem } from "./content";
export interface ProviderConnection {
  id: string;
  workspace: WorkspaceId;
  provider: string;
  accountId: string;
  tokenReference: string;
}
export interface PublishReceipt {
  providerId: string;
  state: "accepted" | "published";
  url?: string;
}
export interface PublishingProvider {
  publish(
    item: ContentItem,
    connection: ProviderConnection,
    idempotencyKey: string,
  ): Promise<PublishReceipt>;
}
export interface VideoRenderProvider {
  render(input: {
    workspace: WorkspaceId;
    storyboard: string;
    assetUrls: string[];
    aspectRatio: "9:16";
  }): Promise<{ jobId: string }>;
  status(
    jobId: string,
  ): Promise<{
    state: "queued" | "rendering" | "ready" | "failed";
    videoUrl?: string;
    error?: string;
  }>;
}
export interface AnalyticsProvider {
  summary(
    workspace: WorkspaceId,
    from: Date,
    to: Date,
  ): Promise<{
    reach: number;
    engagementRate: number;
    organicVisits: number;
    updatedAt: string;
  }>;
}
