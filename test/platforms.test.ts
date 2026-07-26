import { describe, it, expect } from "vite-plus/test";
import { getZoteroBinPath, constructDownloadUrl } from "../src/platforms";
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

describe("constructDownloadUrl", () => {
  it("should construct Windows x64 download URL", () => {
    const url = constructDownloadUrl("win-x64", "release", "7.0.0", "abc123");
    expect(url).toBe(
      "https://download.zotero.org/client/release/7.0.0/Zotero-7.0.0_abc123_setup.exe",
    );
  });

  it("should construct macOS download URL", () => {
    const url = constructDownloadUrl("mac", "beta", "7.1-beta.39", "0acfcd3f9");
    expect(url).toBe(
      "https://download.zotero.org/client/beta/7.1-beta.39/Zotero-7.1-beta.39_0acfcd3f9.dmg",
    );
  });

  it("should construct Linux download URL", () => {
    const url = constructDownloadUrl("linux-x86_64", "release", "7.0.0", "abc123");
    expect(url).toBe(
      "https://download.zotero.org/client/release/7.0.0/Zotero-7.0.0_abc123_linux-x86_64.tar.bz2",
    );
  });

  it("should throw for unknown platform", () => {
    expect(() => constructDownloadUrl("unknown", "release", "1.0", "abc")).toThrow(
      "Unknown platform",
    );
  });
});
