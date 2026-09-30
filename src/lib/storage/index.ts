import { FileStorage } from "./file";
import { PostgresStorage } from "./postgres";
import type { WaitlistStorage } from "./types";

let storage: WaitlistStorage | null = null;

export function getStorage() {
  if (storage) return storage;

  const adapter = process.env.WAITLIST_STORAGE ?? (process.env.DATABASE_URL ? "postgres" : "file");

  if (adapter === "postgres") {
    storage = new PostgresStorage();
    return storage;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "File storage is development-only. Set DATABASE_URL or WAITLIST_STORAGE=postgres for production deployments.",
    );
  }

  storage = new FileStorage();
  return storage;
}

