import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createDocumentStore } from "./documentStore";
import { createIndexStore, runIndexJob } from "./indexing";

test("indexes stored chunks and skips embeddings already created for the model", async () => {
  const db = new Database(":memory:");
  const request: (url: string, init: RequestInit) => Promise<Response> = async (_input, init) => Response.json({ data: [{ embedding: [String(init?.body).length, 1] }], model: "model-a", usage: { total_tokens: 2 } });
  try {
    createDocumentStore(db).save([{ name: "a.txt", type: "text/plain", size: 6, hash: "a", chunks: ["abc", "def"] }]);
    const store = createIndexStore(db);
    const job = store.createJob("model-a");
    await runIndexJob(store, job, "http://localhost/api/embed", request);
    expect(store.getJob(job)?.status).toBe("completed");
    expect(store.getJob(job)?.indexed_chunks).toBe(2);
    expect(db.query("SELECT document_id, chunk_index, used, job_id FROM embeddings ORDER BY chunk_index").all()).toEqual([{ document_id: 1, chunk_index: 0, used: 0, job_id: job }, { document_id: 1, chunk_index: 1, used: 0, job_id: job }]);
    const next = store.createJob("model-a");
    await runIndexJob(store, next, "http://localhost/api/embed", request);
    expect(store.getJob(next)?.indexed_chunks).toBe(0);
    expect(db.query("SELECT count(*) AS count FROM embeddings").get()).toEqual({ count: 2 });
  } finally { db.close(); }
});

test("records an embedding API failure as a failed job", async () => {
  const db = new Database(":memory:");
  const request: (url: string, init: RequestInit) => Promise<Response> = async () => new Response("unavailable", { status: 503 });
  try {
    createDocumentStore(db).save([{ name: "a.txt", type: "text/plain", size: 1, hash: "a", chunks: ["a"] }]);
    const store = createIndexStore(db);
    const job = store.createJob("model-a");
    await runIndexJob(store, job, "http://localhost/api/embed", request);
    expect(store.getJob(job)?.status).toBe("failed");
    expect(store.getJob(job)?.error).toContain("503");
    expect(store.getJob(job)?.finished_at).not.toBeNull();
  } finally { db.close(); }
});

test("lists all jobs with their stored details, newest first", () => {
  const db = new Database(":memory:");
  try {
    createDocumentStore(db);
    const store = createIndexStore(db);
    expect(store.listJobs()).toEqual([]);
    const first = store.createJob("model-a");
    store.fail(first, "Example error");
    const second = store.createJob("model-b");
    expect(store.listJobs().map((job) => job.id)).toEqual([second, first]);
    expect(store.listJobs()[1]).toMatchObject({ id: first, model: "model-a", status: "failed", error: "Example error", indexed_chunks: 0 });
  } finally { db.close(); }
});
