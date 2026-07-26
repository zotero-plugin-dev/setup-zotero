import { describe, it, expect } from "vitest";
import { parseVersionInput, resolveVersion } from "../src/manifest";
import type { ManifestEntry } from "../src/manifest";

describe("parseVersionInput", () => {
  it("should parse version with buildID", () => {
    const result = parseVersionInput("7.1-beta.39+0acfcd3f9");
    expect(result.version).toBe("7.1-beta.39");
    expect(result.buildID).toBe("0acfcd3f9");
  });

  it("should parse release version with buildID", () => {
    const result = parseVersionInput("7.0.0+d6e67c6f2");
    expect(result.version).toBe("7.0.0");
    expect(result.buildID).toBe("d6e67c6f2");
  });

  it("should throw on missing buildID", () => {
    expect(() => parseVersionInput("7.0.0")).toThrow("Invalid version format");
  });
});

describe("resolveVersion", () => {
  const entries: ManifestEntry[] = [
    { version: "7.0.0", buildID: "aaa1111" },
    { version: "7.0.1", buildID: "bbb2222" },
    { version: "7.0.2", buildID: "ccc3333" },
  ];

  it("should return user-specified version", () => {
    const result = resolveVersion("7.1.0+abc1234", entries);
    expect(result.version).toBe("7.1.0");
    expect(result.buildID).toBe("abc1234");
  });

  it("should return latest entry when userVersion is undefined", () => {
    const result = resolveVersion(undefined, entries);
    expect(result.version).toBe("7.0.2");
    expect(result.buildID).toBe("ccc3333");
  });

  it("should throw on empty manifest", () => {
    expect(() => resolveVersion(undefined, [])).toThrow("Manifest is empty");
  });
});
