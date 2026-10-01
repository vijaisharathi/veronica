import mongoose from "mongoose";
import { logger } from "@/lib/logger";

/**
 * Global interface augmentation for development connection caching.
 */
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export type ConnectionStateName = "disconnected" | "connected" | "connecting" | "disconnecting" | "uninitialized";

const READY_STATE_MAP: Record<number, ConnectionStateName> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

/**
 * Connects to MongoDB with connection caching to survive Next.js hot reloading in development.
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.DATABASE_URL;

  if (!uri) {
    throw new Error("DATABASE_URL environment variable is missing");
  }

  if (cached?.conn) {
    return cached.conn;
  }

  if (!cached?.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    logger.info("Initializing MongoDB connection", { uri: uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@") }, "Database");

    cached!.promise = mongoose.connect(uri, opts).then((m) => {
      logger.info("MongoDB connected successfully", {}, "Database");
      return m;
    }).catch((err: unknown) => {
      logger.error("MongoDB connection failed", { error: err instanceof Error ? err.message : String(err) }, "Database");
      cached!.promise = null;
      throw err;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

/**
 * Gracefully closes the database connection.
 */
export async function disconnectDatabase(): Promise<void> {
  if (cached?.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    logger.info("MongoDB disconnected gracefully", {}, "Database");
  }
}

/**
 * Inspects current connection state without forcing a new connection.
 */
export function getConnectionState(): {
  isConnected: boolean;
  readyState: number;
  stateName: ConnectionStateName;
} {
  const readyState = mongoose.connection.readyState;
  return {
    isConnected: readyState === 1,
    readyState,
    stateName: READY_STATE_MAP[readyState] ?? "uninitialized",
  };
}

/**
 * Pings database to check liveliness.
 */
export async function pingDatabase(): Promise<boolean> {
  try {
    if (mongoose.connection.readyState !== 1) {
      return false;
    }
    const adminDb = mongoose.connection.db?.admin();
    if (!adminDb) {
      return false;
    }
    await adminDb.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Performs a comprehensive database health assessment with latency measurement.
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  stateName: ConnectionStateName;
  latencyMs: number | null;
}> {
  const state = getConnectionState();
  if (!state.isConnected) {
    return {
      connected: false,
      stateName: state.stateName,
      latencyMs: null,
    };
  }

  const start = Date.now();
  const pingOk = await pingDatabase();
  const latencyMs = Date.now() - start;

  return {
    connected: pingOk,
    stateName: pingOk ? "connected" : "disconnected",
    latencyMs: pingOk ? latencyMs : null,
  };
}

