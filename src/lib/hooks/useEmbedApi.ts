import { useState } from "react";
import type { CreateEmbeddingResponse } from "openai/resources/embeddings";
import type { searchEmbeddings } from "../vectorSearch";

export type EmbeddingSearchResponse = CreateEmbeddingResponse & {
  matches: ReturnType<typeof searchEmbeddings>;
};

export function useEmbedApi() {
  const [data, setData] = useState<EmbeddingSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(text: string) {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: text,
      });

      if (!response.ok) {
        throw new Error(`Search request failed (${response.status})`);
      }

      const result: EmbeddingSearchResponse = await response.json();
      setData(result);
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search request failed");
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { search, data, loading, error };
}
