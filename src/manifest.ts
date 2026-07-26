import * as core from "@actions/core";
import { HttpClient } from "@actions/http-client";
import { DOWNLOAD_PAGE_URL } from "./constants";

export async function fetchLatestVersion(platform: string): Promise<string> {
  core.info(`Fetching latest version from: ${DOWNLOAD_PAGE_URL}`);

  const client = new HttpClient("action-setup-zotero");
  const response = await client.get(DOWNLOAD_PAGE_URL);

  if (response.message.statusCode !== 200) {
    throw new Error(`Failed to fetch download page: HTTP ${response.message.statusCode}`);
  }

  const body = await response.readBody();
  const match = body.match(/"standaloneVersions"\s*:\s*(\{[^}]+\})/);
  if (!match) {
    throw new Error("Could not find standaloneVersions in download page");
  }

  try {
    const versions: Record<string, string> = JSON.parse(match[1]);
    const key = platform.replace(/-zip$/, "");
    const version = versions[key];
    if (!version) {
      throw new Error(`No version found for platform: ${platform} (key: ${key})`);
    }
    return version;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("No version found")) throw error;
    throw new Error("Failed to parse standaloneVersions JSON");
  }
}
