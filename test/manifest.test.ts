import { describe, it, expect } from "vite-plus/test";
import { fetchLatestVersion } from "../src/manifest";

describe("fetchLatestVersion", () => {
  it("should return a version for release win-x64-zip", async () => {
    const version = await fetchLatestVersion("release", "win-x64-zip");
    expect(version).toBeTruthy();
    expect(typeof version).toBe("string");
    expect(version).toMatch(/^\d+\.\d+/);
  });

  it("should return a version for beta win-x64-zip", async () => {
    const version = await fetchLatestVersion("beta", "win-x64-zip");
    expect(version).toBeTruthy();
    expect(typeof version).toBe("string");
  });

  it("should return a version for dev mac", async () => {
    const version = await fetchLatestVersion("dev", "mac");
    expect(version).toBeTruthy();
    expect(typeof version).toBe("string");
  });
});
