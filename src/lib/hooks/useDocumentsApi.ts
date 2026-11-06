import { useState } from "react";

type DocumentInfo = { name: string; type: string; size: number } &
  ({ status: "processed"; chunks: string[] } | { status: "pending" });

export function useDocumentsApi() {
  const [data, setData] = useState<DocumentInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: File[]) {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const body = new FormData();
      files.forEach((file) => body.append("documents", file));
      const response = await fetch("/api/docs", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Document upload failed.");
      const documents: DocumentInfo[] = result.documents;
      setData(documents);
      return documents;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Document upload failed.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { upload, data, loading, error };
}
