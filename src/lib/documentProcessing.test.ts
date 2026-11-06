import { describe, expect, test } from "bun:test";
import { chunkText, normalizeDocumentText } from "./documentProcessing";

test("normalizes accents, case, whitespace, and special characters", () => {
  expect(normalizeDocumentText(" Olá,\tMUNDO!\n2026 ")).toBe("olamundo2026");
  expect(normalizeDocumentText("OLA mundo 2026")).toBe("olamundo2026");
});

describe("chunkText", () => {
  test("splits text at the requested size without losing characters", () => {
    expect(chunkText("ab😀cd", 2)).toEqual(["ab", "😀c", "d"]);
  });

  test("returns no chunks for empty text", () => {
    expect(chunkText("", 2)).toEqual([]);
  });

  test("rejects invalid chunk sizes", () => {
    expect(() => chunkText("text", 0)).toThrow();
  });
});
