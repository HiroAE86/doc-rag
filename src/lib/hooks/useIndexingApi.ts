import { useEffect, useState } from "react";

type IndexingJob = {
  id: number;
  status: "queued" | "running" | "completed" | "failed";
  model: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  total_chunks: number;
  indexed_chunks: number;
  error: string | null;
};

export function useIndexingApi() {
  const [job, setJob] = useState<IndexingJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = job?.status === "queued" || job?.status === "running";

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/index", { method: "POST" });
      const result = await response.json();
      if (response.status === 409 && result.job) {
        setJob(result.job);
        return;
      }
      if (!response.ok) throw new Error(result.error || "Could not start indexing.");
      setJob(result.job);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start indexing.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!active || !job) return;
    const id = job.id;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const response = await fetch(`/api/index/${id}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load job status.");
        if (cancelled) return;
        setJob(result.job);
        setError(null);
        if (result.job.status === "queued" || result.job.status === "running") {
          timeout = setTimeout(poll, 2000);
        }
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Could not load job status.");
        timeout = setTimeout(poll, 2000);
      }
    }

    timeout = setTimeout(poll, 1000);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [active, job?.id]);

  return { start, job, loading, active, error };
}
