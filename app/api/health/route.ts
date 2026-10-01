import { NextResponse } from "next/server";
import { apiSuccess } from "@/lib/response";
import { APP_CONFIG } from "@/config/constants";
import { checkDatabaseHealth } from "@/db/client";

export const dynamic = "force-dynamic";

/**
 * Health Check API Endpoint
 * GET /api/health
 *
 * Provides operational liveness and readiness telemetry without exposing internal secrets.
 */
export async function GET(): Promise<NextResponse> {
  const dbHealth = await checkDatabaseHealth();

  const healthData = {
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    version: "0.1.0",
    service: APP_CONFIG.NAME,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      status: dbHealth.stateName,
      connected: dbHealth.connected,
      ...(dbHealth.latencyMs !== null ? { latencyMs: dbHealth.latencyMs } : {}),
    },
  };

  return apiSuccess(healthData, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
