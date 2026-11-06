import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createDocumentStore } from "./documentStore";

test("stores each document's ordered chunks in SQLite", () => {
  const db = new Database(":memory:");
  try {
    const store = createDocumentStore(db);
    store.save([{ name: "notes.txt", type: "text/plain", size: 6, hash: "hash1", chunks: ["abc", "def"] }, { name: "empty.md", type: "text/markdown", size: 0, hash: "hash2", chunks: [] }]);
    expect(db.query("SELECT name FROM documents ORDER BY id").all()).toEqual([{ name: "notes.txt" }, { name: "empty.md" }]);
    expect(db.query("SELECT id, title, hash FROM documents ORDER BY id").all()).toEqual([{ id: 1, title: "notes.txt", hash: "hash1" }, { id: 2, title: "empty.md", hash: "hash2" }]);
    expect(db.query("SELECT chunk_index, content FROM chunks ORDER BY chunk_index").all()).toEqual([{ chunk_index: 0, content: "abc" }, { chunk_index: 1, content: "def" }]);
  } finally {
    db.close();
  }
});

test("rejects repeated hashes and rolls back the whole batch", () => {
  const db = new Database(":memory:");
  try {
    const store = createDocumentStore(db);
    const first = { name: "a.txt", type: "text/plain", size: 1, hash: "same", chunks: ["a"] };
    store.save([first]);
    expect(() => store.save([{ ...first, name: "other.txt", hash: "new" }, { ...first, name: "copy.txt" }])).toThrow();
    expect(() => store.save([{ ...first, hash: "batch" }, { ...first, hash: "batch" }])).toThrow();
    expect(db.query("SELECT name FROM documents").all()).toEqual([{ name: "a.txt" }]);
    expect(db.query("SELECT content FROM chunks").all()).toEqual([{ content: "a" }]);
  } finally {
    db.close();
  }
});

test("upgrades existing documents without losing chunks", () => {
  const db = new Database(":memory:");
  try {
    db.exec("CREATE TABLE documents (id INTEGER PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
    db.exec("INSERT INTO documents (id, name, type, size) VALUES (7, 'old.txt', 'text/plain', 3)");
    db.exec("CREATE TABLE chunks (document_id INTEGER NOT NULL REFERENCES documents(id), chunk_index INTEGER NOT NULL, content TEXT NOT NULL, PRIMARY KEY (document_id, chunk_index))");
    db.exec("INSERT INTO chunks VALUES (7, 0, 'old')");
    createDocumentStore(db);
    createDocumentStore(db);
    expect(db.query("SELECT id, title, hash FROM documents").all()).toEqual([{ id: 7, title: "old.txt", hash: new Bun.CryptoHasher("sha256").update("old").digest("hex") }]);
    expect(db.query("SELECT content FROM chunks WHERE document_id = 7").get()).toEqual({ content: "old" });
  } finally {
    db.close();
  }
});

test("upgrades old hashes using stored text without losing documents", () => {
  const db = new Database(":memory:");
  try {
    db.exec("CREATE TABLE documents (id INTEGER PRIMARY KEY, name TEXT NOT NULL, title TEXT, hash TEXT, type TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
    db.exec("CREATE TABLE chunks (document_id INTEGER NOT NULL REFERENCES documents(id), chunk_index INTEGER NOT NULL, content TEXT NOT NULL, PRIMARY KEY (document_id, chunk_index))");
    db.exec("INSERT INTO documents (id, name, title, hash, type, size) VALUES (1, 'old.txt', 'old.txt', 'raw-hash', 'text/plain', 4)");
    db.exec("INSERT INTO chunks VALUES (1, 0, 'Olá!')");
    const store = createDocumentStore(db);
    const hash = new Bun.CryptoHasher("sha256").update("ola").digest("hex");
    expect(db.query("SELECT hash FROM documents WHERE id = 1").get()).toEqual({ hash });
    expect(() => store.save([{ name: "copy.txt", type: "text/plain", size: 3, hash, chunks: ["OLA"] }])).toThrow();
  } finally {
    db.close();
  }
});
