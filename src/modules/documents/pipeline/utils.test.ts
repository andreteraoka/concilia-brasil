import { describe, expect, it } from "vitest";
import { detectMimeType, sha256Hex } from "./utils";

describe("pipeline utils", () => {
  it("detecta mime type por extensão", () => {
    expect(detectMimeType("/tmp/a.pdf")).toBe("application/pdf");
    expect(detectMimeType("/tmp/a.csv")).toBe("text/csv");
    expect(detectMimeType("/tmp/a.xyz")).toBe("application/octet-stream");
  });

  it("calcula sha256 estável", () => {
    const value = Buffer.from("concilia");
    expect(sha256Hex(value)).toBe(
      "e0fd71a06c1d990d38bcea776e5ff52462701713c32531509a158dd363bd2ff2"
    );
  });
});
