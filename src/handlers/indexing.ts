import { Database } from "bun:sqlite";
import { createDocumentStore } from "../lib/documentStore";
import { createIndexStore, EMBEDDING_MODEL } from "../lib/indexing";

const db = new Database("documents.sqlite", { create: true });
createDocumentStore(db);
const store = createIndexStore(db);

export function startIndexingHandler(_req: Request, server: { url: URL }) {
  let id: number;
  try {
    id = store.createJob(EMBEDDING_MODEL);
  } catch (error) {
    const active = store.activeJob();
    if (active)
      return Response.json(
        { error: "An indexing job is already active.", job: active },
        { status: 409 },
      );
    throw error;
  }
  try {
    const worker = new Worker(
      new URL("../indexingWorker.ts", import.meta.url).href,
    );
    worker.onmessage = () => worker.terminate();
    worker.onerror = (event) => {
      store.fail(id, event.message || "Indexing worker failed.");
      worker.terminate();
    };
    const endpoint = new URL("/api/embed", server.url);
    endpoint.hostname = "127.0.0.1";
    worker.postMessage({ id, endpoint: endpoint.href });
  } catch (error) {
    store.fail(
      id,
      error instanceof Error
        ? error.message
        : "Could not start indexing worker.",
    );
    return Response.json(
      { error: "Could not start indexing worker.", job: store.getJob(id) },
      { status: 500 },
    );
  }
  return Response.json({ job: store.getJob(id) }, { status: 202 });
}

export function getIndexingJobHandler(req: Request) {
  const id = Number(new URL(req.url).pathname.split("/").pop());
  if (!Number.isSafeInteger(id) || id < 1)
    return Response.json({ error: "Invalid job ID." }, { status: 400 });
  const job = store.getJob(id);
  return job
    ? Response.json({ job })
    : Response.json({ error: "Job not found." }, { status: 404 });
}

export function listIndexingJobsHandler() {
  return Response.json({ jobs: store.listJobs() });
}
