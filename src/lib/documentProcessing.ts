export const DEFAULT_CHUNK_SIZE = 1000;

export function normalizeDocumentText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

export function hashDocumentText(text: string): string {
  return new Bun.CryptoHasher("sha256").update(normalizeDocumentText(text)).digest("hex");
}

export function chunkText(text: string, size = DEFAULT_CHUNK_SIZE): string[] {
  if (!Number.isSafeInteger(size) || size < 1) {
    throw new RangeError("Chunk size must be a positive integer.");
  }
  const characters = Array.from(text);
  const chunks: string[] = [];
  for (let index = 0; index < characters.length; index += size) {
    chunks.push(characters.slice(index, index + size).join(""));
  }
  return chunks;
}
