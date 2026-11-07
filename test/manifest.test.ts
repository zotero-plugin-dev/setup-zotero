import { createServer, type RequestListener } from "node:http";
import { describe, it, expect } from "vite-plus/test";
import { fetchLatestVersion } from "../src/manifest";

interface TestServer {
  apiUrl: string;
  close: () => Promise<void>;
}

async function startServer(handler: RequestListener): Promise<TestServer> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server did not bind to a port");
  return {
    apiUrl: `http://127.0.0.1:${address.port}/version`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

async function timeOf(promise: Promise<unknown>): Promise<number> {
  const start = Date.now();
  await promise.catch(() => {});
  return Date.now() - start;
}

describe("fetchLatestVersion", () => {
  it("should trim the version returned by the API", async () => {
    const server = await startServer((req, res) => {
      expect(req.url).toBe("/version?channel=release&platform=win-x64");
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("7.0.11\n");
    });
    try {
      await expect(
        fetchLatestVersion("release", "win-x64-zip", { apiUrl: server.apiUrl }),
      ).resolves.toBe("7.0.11");
    } finally {
      await server.close();
    }
  });

  it("should fail immediately on a non-200 response", async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(503, { "content-type": "text/html" });
      res.end("<html><body>Service Unavailable</body></html>");
    });
    try {
      const promise = fetchLatestVersion("release", "linux-x86_64", { apiUrl: server.apiUrl });
      await expect(promise).rejects.toThrow(/HTTP 503/);
      await expect(promise).rejects.toThrow(/maintenance/);
    } finally {
      await server.close();
    }
  });

  it("should fail fast when the server stalls before sending the body", async () => {
    // Reproduces the hang: headers arrive, the body never ends.
    const server = await startServer((_req, res) => {
      res.writeHead(503, { "content-type": "text/html" });
      res.write("<html>maintenance");
    });
    try {
      const elapsed = await timeOf(
        fetchLatestVersion("release", "linux-x86_64", {
          apiUrl: server.apiUrl,
          timeoutMs: 500,
        }),
      );
      expect(elapsed).toBeLessThan(5000);
    } finally {
      await server.close();
    }
  });

  it("should reject an empty body", async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("");
    });
    try {
      await expect(fetchLatestVersion("release", "mac", { apiUrl: server.apiUrl })).rejects.toThrow(
        /empty body/,
      );
    } finally {
      await server.close();
    }
  });

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
