import { describe, it, expect } from "bun:test";
import { filenameToTableName, parseFilenameForPartitioning } from "./state";

describe("parseFilenameForPartitioning", () => {
  it("parses ocr/iapp files correctly", () => {
    const result = parseFilenameForPartitioning(
      "ocr/iapp/2025/2025-01.jsonl"
    );
    expect(result).toEqual({
      baseTable: "ocr_iapp",
      yearMonth: "2025-01",
      partitionDecorator: "$202501",
      publishMonth: "2025-01-01",
    });
  });

  it("parses meta files correctly", () => {
    const result = parseFilenameForPartitioning("meta/1885/1885-01.jsonl");
    expect(result).toEqual({
      baseTable: "meta",
      yearMonth: "1885-01",
      partitionDecorator: "$188501",
      publishMonth: "1885-01-01",
    });
  });

  it("parses meta file from recent year", () => {
    const result = parseFilenameForPartitioning("meta/2024/2024-12.jsonl");
    expect(result).toEqual({
      baseTable: "meta",
      yearMonth: "2024-12",
      partitionDecorator: "$202412",
      publishMonth: "2024-12-01",
    });
  });

  it("throws on invalid filename format", () => {
    expect(() => {
      parseFilenameForPartitioning("ocr/iapp/2025/invalid.jsonl");
    }).toThrow();
  });

  it("throws on unknown path prefix", () => {
    expect(() => {
      parseFilenameForPartitioning("unknown/2025/2025-01.jsonl");
    }).toThrow();
  });
});

describe("filenameToTableName", () => {
  it("converts ocr/iapp files to partitioned table names", () => {
    expect(filenameToTableName("ocr/iapp/2025/2025-01.jsonl")).toBe(
      "ocr_iapp$202501"
    );
  });

  it("converts meta files to partitioned table names", () => {
    expect(filenameToTableName("meta/1885/1885-01.jsonl")).toBe("meta$188501");
  });

  it("handles different months correctly", () => {
    expect(filenameToTableName("ocr/iapp/2025/2025-12.jsonl")).toBe(
      "ocr_iapp$202512"
    );
    expect(filenameToTableName("meta/2024/2024-06.jsonl")).toBe("meta$202406");
  });

  it("handles leading zeros in months", () => {
    expect(filenameToTableName("ocr/iapp/2025/2025-03.jsonl")).toBe(
      "ocr_iapp$202503"
    );
    expect(filenameToTableName("meta/1900/1900-01.jsonl")).toBe("meta$190001");
  });
});
