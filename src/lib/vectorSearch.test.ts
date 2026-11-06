import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createDocumentStore } from "./documentStore";
import { createIndexStore } from "./indexing";
import { searchEmbeddings } from "./vectorSearch";

test("returns matching chunks in cosine similarity order for the requested model", () => {
  const db = new Database(":memory:");
  try {
    createDocumentStore(db).save([{ name: "sample.txt", type: "text/plain", size: 3, hash: "sample", chunks: ["opposite", "same", "different model"] }]);
    const store = createIndexStore(db);
    const job = store.createJob("model-a");
    store.save(job, "model-a", { document_id: 1, chunk_index: 0, content: "opposite" }, [-1, 0], { example: true });
    store.save(job, "model-a", { document_id: 1, chunk_index: 1, content: "same" }, [1, 0], { example: true });
    store.save(job, "model-b", { document_id: 1, chunk_index: 2, content: "different model" }, [1, 0], {});
    expect(searchEmbeddings(db, [1, 0], "model-a")).toEqual([
      { document_id: 1, title: "sample.txt", chunk_index: 1, content: "same", job_id: job, metadata: { example: true }, score: 1 },
      { document_id: 1, title: "sample.txt", chunk_index: 0, content: "opposite", job_id: job, metadata: { example: true }, score: -1 },
    ]);
    expect(searchEmbeddings(db, [0, 0], "model-a")).toEqual([]);
    expect(searchEmbeddings(db, [1, 0, 0], "model-a")).toEqual([]);
    expect(searchEmbeddings(db, [1, 0], "model-a", 1)).toHaveLength(1);
  } finally { db.close(); }
});
