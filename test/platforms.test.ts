import { describe, it, expect } from "vite-plus/test";
import { getZoteroBinPath, constructDownloadUrl } from "../src/platforms";
import * as path from "node:path";

describe("getZoteroBinPath", () => {
  const programDir = "/opt/zotero";

  it("should return zotero.exe for win-x64-zip", () => {
    expect(getZoteroBinPath(programDir, "win-x64-zip")).toBe(path.join(programDir, "zotero.exe"));
  });

  it("should return zotero.exe for win-arm64-zip", () => {
    expect(getZoteroBinPath(programDir, "win-arm64-zip")).toBe(path.join(programDir, "zotero.exe"));
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
  it("should construct URL with version", () => {
    const url = constructDownloadUrl("win-x64-zip", "release", "9.0.6");
    expect(url).toBe(
      "https://www.zotero.org/download/client/dl?channel=release&platform=win-x64-zip&version=9.0.6",
    );
  });

  it("should construct URL for latest version", () => {
    const url = constructDownloadUrl("mac", "beta");
    expect(url).toBe("https://www.zotero.org/download/client/dl?channel=beta&platform=mac");
  });

  it("should construct URL for beta with buildID", () => {
    const url = constructDownloadUrl("win-x64-zip", "beta", "10.0-beta.16+566115dc7");
    expect(url).toBe(
      "https://www.zotero.org/download/client/dl?channel=beta&platform=win-x64-zip&version=10.0-beta.16+566115dc7",
    );
  });
});
