import { EmbeddingSearchCard } from "@/components/embed/embeddingSearchCard";
import { DocumentUploadCard } from "@/components/documents/documentUploadCard";
import { IndexingJobCard } from "@/components/indexing/indexingJobCard";
import "./index.css";

export function App() {
  return (
    <main className="container relative z-10 mx-auto flex flex-col items-center gap-6 p-8">
      <nav className="flex w-full justify-end gap-4 text-sm"><a href="/">Workspace</a><a href="/docs">Project guide</a></nav>
      <EmbeddingSearchCard />
      <DocumentUploadCard />
      <IndexingJobCard />
    </main>
  );
}

export default App;
