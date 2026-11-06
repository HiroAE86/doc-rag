import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDocumentsApi } from "@/lib/hooks/useDocumentsApi";

export function DocumentUploadCard() {
  const [files, setFiles] = useState<File[]>([]);
  const { upload, data, loading, error } = useDocumentsApi();
  const tooMany = files.length > 20;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length && !tooMany && !loading) void upload(files);
  }

  return (
    <Card className="w-full max-w-2xl text-left">
      <CardHeader>
        <CardTitle>Upload documents</CardTitle>
        <CardDescription>Select up to 20 PDF, image, text, or Markdown files. Text chunks are saved; original files are not.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="documents">Documents</Label>
            <Input id="documents" type="file" accept="application/pdf,image/*,text/plain,text/markdown,.txt,.md,.markdown" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
            <p className="text-sm text-muted-foreground">{files.length} selected (maximum 20)</p>
          </div>
          {tooMany && <p role="alert" className="text-sm text-destructive">Select no more than 20 files.</p>}
          <Button type="submit" disabled={!files.length || tooMany || loading}>{loading ? "Uploading..." : "Upload documents"}</Button>
        </form>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        {data && <div className="mt-6 space-y-4" aria-live="polite"><p className="text-sm font-medium">Received {data.length} {data.length === 1 ? "file" : "files"}</p>{data.map((file, index) => <section key={index} className="space-y-2"><h2 className="break-all text-sm font-medium">{file.name}</h2>{file.status === "processed" ? <><p className="text-sm text-muted-foreground">{file.chunks.length} chunks</p>{file.chunks.map((chunk, chunkIndex) => <pre key={chunkIndex} className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs">{chunk}</pre>)}</> : <p className="text-sm text-muted-foreground">Text extraction is not available for this file type yet.</p>}</section>)}</div>}
      </CardContent>
    </Card>
  );
}
