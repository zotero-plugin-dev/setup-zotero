import { describe, it, expect } from "vite-plus/test";
import { getZoteroBinPath } from "../src/platforms";
import { constructDownloadUrl } from "../src/install";
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
  it("should append -zip for win-x64", () => {
    const url = constructDownloadUrl("win-x64", "release", "9.0.6");
    expect(url).toBe(
      "https://www.zotero.org/download/client/dl?channel=release&platform=win-x64-zip&version=9.0.6",
    );
  });

  it("should append -zip for win-arm64", () => {
    const url = constructDownloadUrl("win-arm64", "release", "9.0.6");
    expect(url).toBe(
      "https://www.zotero.org/download/client/dl?channel=release&platform=win-arm64-zip&version=9.0.6",
    );
  });

  it("should not append -zip for mac", () => {
    const url = constructDownloadUrl("mac", "beta");
    expect(url).toBe("https://www.zotero.org/download/client/dl?channel=beta&platform=mac");
  });

  it("should URL-encode + in version", () => {
    const url = constructDownloadUrl("win-x64", "beta", "10.0-beta.16+566115dc7");
    expect(url).toBe(
      "https://www.zotero.org/download/client/dl?channel=beta&platform=win-x64-zip&version=10.0-beta.16%2B566115dc7",
    );
  });

  it("should construct URL without version", () => {
    const url = constructDownloadUrl("linux-x86_64", "dev");
    expect(url).toBe("https://www.zotero.org/download/client/dl?channel=dev&platform=linux-x86_64");
  });
});
