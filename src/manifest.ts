import * as core from "@actions/core";
import { HttpClient, type HttpClientResponse } from "@actions/http-client";
import { HTTP_TIMEOUT_MS, VERSION_API_URL } from "./constants";

const BODY_PREVIEW_LIMIT = 120;

export interface FetchVersionOptions {
  /** Overrides the version API endpoint (used by tests). */
  apiUrl?: string;
  /** Deadline for each phase of the request, defaults to HTTP_TIMEOUT_MS. */
  timeoutMs?: number;
}

function toApiPlatform(platform: string): string {
  return platform.replace(/-zip$/, "");
}

/** Short, single-line preview of a response body for error messages. */
function preview(body: string): string {
  const text = body
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.length > BODY_PREVIEW_LIMIT ? `${text.slice(0, BODY_PREVIEW_LIMIT)}...` : text;
}

function describeBody(body: string): string {
  const detail = preview(body);
  return detail ? `"${detail}"` : "empty body";
}

/**
 * Reads the whole response body, killing the socket when the deadline expires.
 *
 * `HttpClientResponse.readBody()` is not used here: it only listens for `end`,
 * so a stalled or aborted response never settles and the action process hangs
 * until the runner timeout.
 */
function readBody(response: HttpClientResponse, timeoutMs: number): Promise<string> {
  const message = response.message;

  return new Promise<string>((resolve, reject) => {
    let body = "";
    let done = false;
    let deadline: NodeJS.Timeout;

    const succeed = (): void => {
      if (done) return;
      done = true;
      clearTimeout(deadline);
      resolve(body);
    };

    const fail = (error: Error): void => {
      if (done) return;
      done = true;
      clearTimeout(deadline);
      reject(error);
    };

    deadline = setTimeout(() => {
      // Destroying the message also destroys its socket; an unread response
      // would otherwise keep the process alive after the action has failed.
      message.destroy();
      fail(new Error(`request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    message.setEncoding("utf8");
    message.on("data", (chunk: string) => {
      body += chunk;
    });
    message.on("end", succeed);
    message.on("error", fail);
    message.on("close", () =>
      fail(new Error("connection closed before the response was complete")),
    );
  });
}

export async function fetchLatestVersion(
  channel: string,
  platform: string,
  options: FetchVersionOptions = {},
): Promise<string> {
  const apiUrl = options.apiUrl ?? VERSION_API_URL;
  const timeoutMs = options.timeoutMs ?? HTTP_TIMEOUT_MS;
  const url = `${apiUrl}?channel=${channel}&platform=${toApiPlatform(platform)}`;
  core.info(`Fetching latest version from: ${url}`);

  const client = new HttpClient("action-setup-zotero", [], {
    socketTimeout: timeoutMs,
    // Never leave an idle keep-alive socket behind after the request.
    keepAlive: false,
  });

  let status = 0;
  let statusMessage = "";
  let body = "";

  try {
    const response = await client.get(url);
    status = response.message.statusCode ?? 0;
    statusMessage = response.message.statusMessage ?? "";
    // The body is always drained, including for error responses: a non-200
    // must fail the step immediately, not leave a socket keeping it alive.
    body = await readBody(response, timeoutMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch version from ${url}: ${message}`);
  } finally {
    client.dispose();
  }

  if (status !== 200) {
    // Fail fast: no retries, no waiting for the job timeout.
    const hint =
      status >= 500
        ? " The Zotero server may be under maintenance; retry later, or pin the `zotero-version` input to skip this lookup."
        : "";
    throw new Error(
      `Failed to fetch version from ${url}: HTTP ${status}${statusMessage ? ` ${statusMessage}` : ""}` +
        `, response body: ${describeBody(body)}.${hint}`,
    );
  }

  const version = body.trim();
  if (!/^\d+\.\d+/.test(version)) {
    throw new Error(
      `Unexpected response from ${url}: ${describeBody(version)}. ` +
        "Pin the `zotero-version` input to skip the version lookup.",
    );
  }

  return version;
}
