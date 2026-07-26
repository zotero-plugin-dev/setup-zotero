import { describe, it, expect } from "vite-plus/test";
import { getZoteroBinPath } from "../src/platforms";
import * as path from "node:path";

describe("getZoteroBinPath", () => {
  const programDir = "/opt/zotero";

  it("should return zotero.exe for win-x64", () => {
    expect(getZoteroBinPath(programDir, "win-x64")).toBe(path.join(programDir, "zotero.exe"));
  });

  it("should return zotero.exe for win-arm64", () => {
    expect(getZoteroBinPath(programDir, "win-arm64")).toBe(path.join(programDir, "zotero.exe"));
  });

  it("should return macOS path", () => {
    expect(getZoteroBinPath(programDir, "mac")).toBe(
      path.join(programDir, "Zotero.app", "Contents", "MacOS", "zotero"),
    );
  });

  it("should return zotero for linux-x86_64", () => {
    expect(getZoteroBinPath(programDir, "linux-x86_64")).toBe(path.join(programDir, "zotero"));
  });

  it("should return zotero for linux-i686", () => {
    expect(getZoteroBinPath(programDir, "linux-i686")).toBe(path.join(programDir, "zotero"));
  });

  it("should throw for unknown platform", () => {
    expect(() => getZoteroBinPath(programDir, "freebsd")).toThrow("Unknown platform");
  });
});
