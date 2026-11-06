import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEmbedApi } from "@/lib/hooks/useEmbedApi";

export function EmbeddingSearchCard() {
  const [text, setText] = useState("");
  const { search, data, loading, error } = useEmbedApi();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (text.trim() && !loading) void search(text);
  }

  return (
    <Card className="w-full max-w-2xl text-left">
      <CardHeader>
        <CardTitle>Search documents</CardTitle>
        <CardDescription>Find indexed document chunks related to your text.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="search-text">Search text</Label>
            <Textarea
              id="search-text"
              placeholder="Describe what you're looking for"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={5}
            />
          </div>
          <Button type="submit" disabled={loading || !text.trim()}>
            {loading ? "Searching..." : "Search documents"}
          </Button>
        </form>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>
        )}
        {data && (
          <section className="mt-6 space-y-3" aria-label="Search results" aria-live="polite">
            <h2 className="text-sm font-medium">Search results</h2>
            {data.matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching indexed chunks found.</p>
            ) : (
              <ol className="space-y-3">
                {data.matches.map((match) => (
                  <li key={`${match.document_id}-${match.chunk_index}`} className="space-y-2 rounded-md border p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-medium">{match.title}</h3>
                      <span className="text-sm text-muted-foreground">Similarity: {match.score.toFixed(3)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm">{match.content}</p>
                    <p className="text-xs text-muted-foreground">Chunk {match.chunk_index + 1}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
