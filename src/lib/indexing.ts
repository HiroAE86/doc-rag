import { Database } from "bun:sqlite";

export const EMBEDDING_MODEL = "text-embedding-nomic-embed-text-v1.5";

type JobStatus = "queued" | "running" | "completed" | "failed";
type Job = { id: number; status: JobStatus; model: string; started_at: string | null; finished_at: string | null; total_chunks: number; indexed_chunks: number; error: string | null; created_at: string };
type Chunk = { document_id: number; chunk_index: number; content: string };

export function createIndexStore(db: Database) {
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`CREATE TABLE IF NOT EXISTS indexing_jobs (
    id INTEGER PRIMARY KEY, status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'completed', 'failed')),
    model TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, started_at TEXT, finished_at TEXT,
    total_chunks INTEGER NOT NULL DEFAULT 0, indexed_chunks INTEGER NOT NULL DEFAULT 0, error TEXT
  )`);
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS one_active_indexing_job ON indexing_jobs ((1)) WHERE status IN ('queued', 'running')");
  db.exec(`CREATE TABLE IF NOT EXISTS embeddings (
    id INTEGER PRIMARY KEY, document_id INTEGER NOT NULL, chunk_index INTEGER NOT NULL,
    model TEXT NOT NULL, embedding TEXT NOT NULL, metadata TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0,
    job_id INTEGER NOT NULL REFERENCES indexing_jobs(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id, chunk_index) REFERENCES chunks(document_id, chunk_index) ON DELETE CASCADE,
    UNIQUE(document_id, chunk_index, model)
  )`);
  return {
    createJob(model: string) { return Number(db.prepare("INSERT INTO indexing_jobs (status, model) VALUES ('queued', ?)").run(model).lastInsertRowid); },
    listJobs() { return db.query<Job, []>("SELECT * FROM indexing_jobs ORDER BY id DESC").all(); },
    getJob(id: number) { return db.query<Job, [number]>("SELECT * FROM indexing_jobs WHERE id = ?").get(id); },
    activeJob() { return db.query<Job, []>("SELECT * FROM indexing_jobs WHERE status IN ('queued', 'running') LIMIT 1").get(); },
    start(id: number, model: string) {
      const chunks = db.query<Chunk, [string]>(`SELECT c.document_id, c.chunk_index, c.content FROM chunks c
        WHERE NOT EXISTS (SELECT 1 FROM embeddings e WHERE e.document_id = c.document_id AND e.chunk_index = c.chunk_index AND e.model = ?)
        ORDER BY c.document_id, c.chunk_index`).all(model);
      db.prepare("UPDATE indexing_jobs SET status = 'running', started_at = CURRENT_TIMESTAMP, total_chunks = ? WHERE id = ?").run(chunks.length, id);
      return chunks;
    },
    save(id: number, model: string, chunk: Chunk, embedding: number[], metadata: unknown) {
      db.transaction(() => {
        db.prepare("INSERT INTO embeddings (document_id, chunk_index, model, embedding, metadata, job_id) VALUES (?, ?, ?, ?, ?, ?)").run(chunk.document_id, chunk.chunk_index, model, JSON.stringify(embedding), JSON.stringify(metadata), id);
        db.prepare("UPDATE indexing_jobs SET indexed_chunks = indexed_chunks + 1 WHERE id = ?").run(id);
      })();
    },
    complete(id: number) { db.prepare("UPDATE indexing_jobs SET status = 'completed', finished_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'running'").run(id); },
    fail(id: number, error: string) { db.prepare("UPDATE indexing_jobs SET status = 'failed', finished_at = CURRENT_TIMESTAMP, error = ? WHERE id = ? AND status IN ('queued', 'running')").run(error, id); },
  };
}

export async function runIndexJob(store: ReturnType<typeof createIndexStore>, id: number, endpoint: string, request: (url: string, init: RequestInit) => Promise<Response> = fetch) {
  try {
    const job = store.getJob(id);
    if (!job || job.status !== "queued") throw new Error("Job is not queued.");
    for (const chunk of store.start(id, job.model)) {
      const response = await request(endpoint, { method: "POST", headers: { "Content-Type": "text/plain; charset=utf-8" }, body: chunk.content });
      if (!response.ok) throw new Error(`Embedding API returned ${response.status}`);
      const result: unknown = await response.json();
      if (!result || typeof result !== "object" || !("data" in result) || !Array.isArray(result.data) || !result.data[0] || !Array.isArray(result.data[0].embedding) || !result.data[0].embedding.length || !result.data[0].embedding.every((value: unknown) => typeof value === "number" && Number.isFinite(value))) throw new Error("Embedding API returned an invalid vector.");
      if ("model" in result && result.model !== job.model) throw new Error("Embedding API returned a different model.");
      const metadata = { model: job.model, usage: "usage" in result ? result.usage : null };
      store.save(id, job.model, chunk, result.data[0].embedding, metadata);
    }
    store.complete(id);
  } catch (error) {
    store.fail(id, error instanceof Error ? error.message : "Unknown indexing error");
  }
}
