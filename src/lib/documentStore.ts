import { Database } from "bun:sqlite";
import { hashDocumentText } from "./documentProcessing";

type DocumentToSave = { name: string; type: string; size: number; hash: string; chunks: string[] };

export class DuplicateDocumentError extends Error {
  constructor(name: string) {
    super(`File already uploaded: ${name}`);
  }
}

export function createDocumentStore(db: Database) {
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    hash TEXT,
    type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  db.transaction(() => {
    const columns = db.query<{ name: string }, []>("PRAGMA table_info(documents)").all();
    if (!columns.some((column) => column.name === "title")) {
      db.exec("ALTER TABLE documents ADD COLUMN title TEXT");
      db.exec("UPDATE documents SET title = name");
    }
    if (!columns.some((column) => column.name === "hash")) {
      db.exec("ALTER TABLE documents ADD COLUMN hash TEXT");
    }
  })();
  db.exec(`CREATE TABLE IF NOT EXISTS chunks (
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    PRIMARY KEY (document_id, chunk_index)
  )`);
  db.exec("CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY)");
  db.transaction(() => {
    if (db.query("SELECT 1 FROM app_migrations WHERE name = ?").get("normalized_document_hash_v1")) return;
    const documents = db.query<{ id: number; name: string; type: string }, []>("SELECT id, name, type FROM documents").all();
    const readChunks = db.query<{ content: string }, [number]>("SELECT content FROM chunks WHERE document_id = ? ORDER BY chunk_index");
    const updateHash = db.prepare("UPDATE documents SET hash = ? WHERE id = ?");
    for (const document of documents) {
      const isText = document.type === "text/plain" || document.type === "text/markdown" || (document.type === "" && /\.(txt|md|markdown)$/i.test(document.name));
      const text = isText ? readChunks.all(document.id).map((chunk) => chunk.content).join("") : null;
      updateHash.run(text === null ? null : hashDocumentText(text), document.id);
    }
    db.prepare("INSERT INTO app_migrations (name) VALUES (?)").run("normalized_document_hash_v1");
  })();
  const insertDocument = db.prepare("INSERT INTO documents (name, title, hash, type, size) VALUES (?, ?, ?, ?, ?)");
  const insertChunk = db.prepare("INSERT INTO chunks (document_id, chunk_index, content) VALUES (?, ?, ?)");
  const findHash = db.prepare("SELECT 1 FROM documents WHERE hash = ? LIMIT 1");
  const saveTransaction = db.transaction((documents: DocumentToSave[]) => {
    for (const document of documents) {
      if (findHash.get(document.hash)) throw new DuplicateDocumentError(document.name);
      const result = insertDocument.run(document.name, document.name, document.hash, document.type, document.size);
      document.chunks.forEach((chunk, index) => insertChunk.run(result.lastInsertRowid, index, chunk));
    }
  });
  return { save: (documents: DocumentToSave[]) => saveTransaction.immediate(documents) };
}
