import * as core from "@actions/core";
import { HttpClient } from "@actions/http-client";
import { VERSION_API_URL } from "./constants";

function toApiPlatform(platform: string): string {
  return platform.replace(/-zip$/, "");
}

export async function fetchLatestVersion(channel: string, platform: string): Promise<string> {
  const url = `${VERSION_API_URL}?channel=${channel}&platform=${toApiPlatform(platform)}`;
  core.info(`Fetching latest version from: ${url}`);

  const client = new HttpClient("action-setup-zotero");
  const response = await client.get(url);

  if (response.message.statusCode !== 200) {
    throw new Error(`Failed to fetch version: HTTP ${response.message.statusCode}`);
  }

  return (await response.readBody()).trim();
}
