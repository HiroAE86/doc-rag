import { chunkText, hashDocumentText } from "../lib/documentProcessing";
import { Database } from "bun:sqlite";
import { createDocumentStore, DuplicateDocumentError } from "../lib/documentStore";

const documentStore = createDocumentStore(new Database("documents.sqlite", { create: true }));

export async function documentsHandler(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json(
      { error: "Expected multipart form data." },
      { status: 400 },
    );
  }

  const documents = form.getAll("documents");
  if (documents.length < 1 || documents.length > 20) {
    return Response.json(
      { error: "Select between 1 and 20 files." },
      { status: 400 },
    );
  }
  if (
    documents.some(
      (file) =>
        !(file instanceof File) ||
        !(
          file.type === "application/pdf" ||
          file.type.startsWith("image/") ||
          file.type === "text/plain" ||
          file.type === "text/markdown" ||
          (file.type === "" && /\.(txt|md|markdown)$/i.test(file.name))
        ),
    )
  ) {
    return Response.json(
      { error: "Only PDF, image, text, and Markdown files are supported." },
      { status: 400 },
    );
  }

  const files = documents.filter((file): file is File => file instanceof File);
  const processed = await Promise.all(
    files.map(async (file) => {
      const info = { name: file.name, type: file.type, size: file.size };
      if (
        file.type === "text/plain" ||
        file.type === "text/markdown" ||
        (file.type === "" && /\.(txt|md|markdown)$/i.test(file.name))
      ) {
        const text = await file.text();
        return {
          ...info,
          status: "processed" as const,
          hash: hashDocumentText(text),
          chunks: chunkText(text),
        };
      }
      return { ...info, status: "pending" as const };
    }),
  );

  try {
    documentStore.save(processed.filter((document) => document.status === "processed"));
  } catch (error) {
    if (error instanceof DuplicateDocumentError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
  return Response.json({ documents: processed });
}
