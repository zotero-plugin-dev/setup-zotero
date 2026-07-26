import { describe, it, expect } from "vite-plus/test";
import { constructDownloadUrl } from "../src/install";

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
