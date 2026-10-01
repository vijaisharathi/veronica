/**
 * VÉRONA — Database Index Synchronization & Management
 *
 * Ensures all declared compound, unique, sparse, and TTL indexes
 * across all collections are synchronized with MongoDB.
 */

import { logger } from "@/lib/logger";
import { connectToDatabase } from "./client";
import { ALL_MODELS } from "./models";

export interface IndexSyncResult {
  modelName: string;
  collectionName: string;
  status: "synced" | "skipped" | "failed";
  error?: string;
}

export async function syncDatabaseIndexes(): Promise<IndexSyncResult[]> {
  await connectToDatabase();
  logger.info("Starting database index synchronization across all models", { modelCount: ALL_MODELS.length }, "DatabaseIndexes");

  const results: IndexSyncResult[] = [];

  for (const model of ALL_MODELS) {
    const modelName = model.modelName;
    const collectionName = model.collection.name;

    try {
      await model.syncIndexes();
      results.push({
        modelName,
        collectionName,
        status: "synced",
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.warn(
        `Index synchronization failed for model ${modelName}`,
        { modelName, collectionName, error: errorMsg },
        "DatabaseIndexes"
      );
      results.push({
        modelName,
        collectionName,
        status: "failed",
        error: errorMsg,
      });
    }
  }

  const successCount = results.filter((r) => r.status === "synced").length;
  logger.info(
    `Database index synchronization complete: ${successCount}/${results.length} synchronized successfully`,
    { successCount, total: results.length },
    "DatabaseIndexes"
  );

  return results;
}
