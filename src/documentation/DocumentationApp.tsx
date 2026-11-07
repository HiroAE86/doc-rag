import "./documentation.css";

const sections = [
  { id: "overview", title: "RAG, in this project" },
  { id: "ingestion", title: "1. Ingest documents" },
  { id: "indexing", title: "2. Build the index" },
  { id: "retrieval", title: "3. Retrieve context" },
  { id: "next", title: "4. Extend the pipeline" },
];

export function DocumentationApp() {
  return (
    <div className="docs-shell">
      <header className="docs-topbar"><a className="docs-brand" href="/">DOC<span>RAG</span></a><nav><a href="/">Workspace</a><a href="/docs" aria-current="page">Guide</a></nav></header>
      <div className="docs-layout">
        <aside className="docs-sidebar"><p className="docs-kicker">FIELD GUIDE / 01</p><h2>Learn the pipeline</h2>{sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}</aside>
        <main className="docs-content">
          <p className="docs-kicker">A HANDS-ON RAG LAB</p>
          <h1>Make documents<br/><span>useful to a model.</span></h1>
          <p className="docs-lead">Retrieval augmented generation (RAG) connects a language model to knowledge outside its training data. This repo is a small lab for the steps that make that possible.</p>
          <section id="overview"><h2>RAG, in this project</h2><p>RAG has two paths. An offline indexing path turns source documents into searchable vectors. A query path embeds a question, retrieves nearby chunks, and gives those chunks to a language model as context.</p><div className="docs-flow"><span>Documents</span><b>→</b><span>Chunks</span><b>→</b><span>Embeddings</span><b>→</b><span>Retrieval</span></div><p className="docs-note">Current scope: this app uploads text, Markdown, PDFs, and images. Text is chunked and stored; the indexing worker creates embeddings. Search returns matching chunks. Generation from retrieved context is the next learning step.</p></section>
          <section id="ingestion"><p className="docs-step">01 / INGESTION</p><h2>Prepare useful pieces</h2><p>Documents vary in size and format. Ingestion extracts text and splits it into chunks small enough to embed and retrieve. Chunk size affects both context and precision: large chunks preserve more context, while small chunks can match a specific fact more closely.</p><pre><code>{`source document\n  → extract text\n  → normalize for duplicate detection\n  → split into chunks`}</code></pre><p>In this repo, <code>src/lib/documentProcessing.ts</code> handles normalization, hashing, and chunking. The upload handler stores text chunks and marks non-text files pending.</p></section>
          <section id="indexing"><p className="docs-step">02 / INDEXING</p><h2>Map meaning to vectors</h2><p>An embedding model maps each chunk to a numeric vector. Related meanings tend to land near each other in vector space. The worker stores vectors alongside chunk content so a later query can compare against them.</p><pre><code>{`chunk text → embedding model → [0.12, -0.08, …]\n                              ↘ stored with chunk + model`}</code></pre><p>Embeddings depend on their model. Comparing vectors from different models is not meaningful, so indexing records the model and retrieval filters by it.</p></section>
          <section id="retrieval"><p className="docs-step">03 / RETRIEVAL</p><h2>Find context for a question</h2><p>At query time, embed the question with the same model and rank stored vectors by cosine similarity. The nearest chunks become candidate context. Retrieval quality depends on chunking, embedding choice, and whether the source actually contains the answer.</p><pre><code>{`question → query vector → similarity ranking → top chunks`}</code></pre><p>The current UI exposes embedding search so you can inspect matches directly. That makes retrieval behavior visible before adding answer generation.</p></section>
          <section id="next"><p className="docs-step">04 / EXPERIMENT</p><h2>Extend one step at a time</h2><p>A natural next experiment is to pass the retrieved chunks and question to a chat model, then inspect whether the answer is grounded in those sources. Try changing chunk size, comparing embedding models, and testing queries whose answers are absent from the documents.</p><a className="docs-cta" href="/">Open the workspace <span>↗</span></a></section>
          <footer>DOC-RAG LAB <span>Built for learning by doing.</span></footer>
        </main>
      </div>
    </div>
  );
}
