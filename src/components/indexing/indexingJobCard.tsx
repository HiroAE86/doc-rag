import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIndexingApi } from "@/lib/hooks/useIndexingApi";

export function IndexingJobCard() {
  const { start, job, loading, active, error } = useIndexingApi();

  return (
    <Card className="w-full max-w-2xl text-left">
      <CardHeader>
        <CardTitle>Index documents</CardTitle>
        <CardDescription>Generate embeddings for stored document chunks that have not yet been indexed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button type="button" onClick={() => void start()} disabled={loading || active}>
          {loading ? "Starting..." : active ? "Indexing..." : "Start indexing"}
        </Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {job && (
          <section aria-live="polite" aria-label="Indexing job status" className="space-y-2 text-sm">
            <p className="font-medium">Job #{job.id}: {job.status}</p>
            <p>{job.indexed_chunks} of {job.total_chunks} chunks indexed</p>
            <p className="break-all text-muted-foreground">Model: {job.model}</p>
            {job.error && <p role="alert" className="text-destructive">{job.error}</p>}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
