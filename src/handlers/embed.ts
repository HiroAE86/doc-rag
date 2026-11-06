import { Database } from "bun:sqlite";
import OpenAI from "openai";
import { createDocumentStore } from "../lib/documentStore";
import { createIndexStore, EMBEDDING_MODEL } from "../lib/indexing";
import { searchEmbeddings } from "../lib/vectorSearch";

const db = new Database("documents.sqlite", { create: true });
createDocumentStore(db);
createIndexStore(db);
const client = new OpenAI({
  apiKey: "lm-studio",
  baseURL: "http://localhost:1234/v1",
});

export async function embedHandler(req: Request) {
  const embedResult = await client.embeddings.create({
    input: await req.text(),
    model: EMBEDDING_MODEL,
  });

  const vector = embedResult.data[0]?.embedding;
  if (!vector?.length || !vector.every(Number.isFinite)) {
    return Response.json(
      { error: "Embedding API returned an invalid vector." },
      { status: 502 },
    );
  }

  return Response.json({
    ...embedResult,
    matches: searchEmbeddings(db, vector, EMBEDDING_MODEL, 5),
  });
}
