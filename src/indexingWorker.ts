import { Database } from "bun:sqlite";
import { createIndexStore, runIndexJob } from "./lib/indexing";

self.onmessage = async (
  event: MessageEvent<{ id: number; endpoint: string }>,
) => {
  const db = new Database("documents.sqlite", { readwrite: true });
  try {
    await runIndexJob(createIndexStore(db), event.data.id, event.data.endpoint);
    self.postMessage({ done: true });
  } finally {
    db.close();
  }
};
