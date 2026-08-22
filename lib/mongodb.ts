import { MongoClient } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

function connect(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }
  return new MongoClient(uri).connect();
}

// Lazy: only connects (and only checks MONGODB_URI) on first real DB call,
// not at module import time — Next.js imports route modules during build's
// page-data collection step, before env vars are necessarily available.
export default function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    // Reuse the client across hot reloads in dev so we don't open a new
    // connection pool on every file change.
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = connect();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = connect();
  }
  return clientPromise;
}
