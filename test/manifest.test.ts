import { describe, it, expect } from "vite-plus/test";
import { fetchLatestVersion } from "../src/manifest";

describe("fetchLatestVersion", () => {
  it("should return a version string for win-x64-zip", async () => {
    const version = await fetchLatestVersion("win-x64-zip");
    expect(version).toBeTruthy();
    expect(typeof version).toBe("string");
    expect(version).toMatch(/^\d+\.\d+/);
  });

  it("should return a version string for mac", async () => {
    const version = await fetchLatestVersion("mac");
    expect(version).toBeTruthy();
    expect(typeof version).toBe("string");
    expect(version).toMatch(/^\d+\.\d+/);
  });
});
