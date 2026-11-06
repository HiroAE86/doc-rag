import type { Database } from "bun:sqlite";

type StoredEmbedding = {
  document_id: number;
  title: string;
  chunk_index: number;
  content: string;
  embedding: string;
  metadata: string;
  job_id: number;
};

export function searchEmbeddings(db: Database, vector: number[], model: string, limit = 10) {
  const queryNorm = Math.hypot(...vector);
  if (!queryNorm || !Number.isFinite(queryNorm)) return [];

  const rows = db.query<StoredEmbedding, [string]>(`SELECT e.document_id, d.title, e.chunk_index, c.content,
    e.embedding, e.metadata, e.job_id FROM embeddings e
    JOIN chunks c ON c.document_id = e.document_id AND c.chunk_index = e.chunk_index
    JOIN documents d ON d.id = e.document_id WHERE e.model = ?`).all(model);

  return rows.flatMap(({ embedding, metadata, ...row }) => {
    try {
      const stored: unknown = JSON.parse(embedding);
      if (!Array.isArray(stored) || stored.length !== vector.length || !stored.every((value: unknown) => typeof value === "number" && Number.isFinite(value))) return [];
      const norm = Math.hypot(...stored);
      if (!norm || !Number.isFinite(norm)) return [];
      const score = stored.reduce((sum: number, value: number, index: number) => sum + (value / norm) * (vector[index]! / queryNorm), 0);
      return [{ ...row, metadata: JSON.parse(metadata), score }];
    } catch {
      return [];
    }
  }).sort((a, b) => b.score - a.score || a.document_id - b.document_id || a.chunk_index - b.chunk_index).slice(0, limit);
}
