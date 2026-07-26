import * as core from "@actions/core";
import { HttpClient } from "@actions/http-client";
import { MANIFEST_BASE_URL, MANIFEST_PATH_TEMPLATE } from "./constants";

export interface ManifestEntry {
  version: string;
  buildID: string;
  detailsURL?: string;
  major?: string | null;
}

export function resolveVersion(
  userVersion: string | undefined,
  entries: ManifestEntry[],
): { version: string; buildID: string } {
  if (userVersion) {
    return parseVersionInput(userVersion);
  }
  if (entries.length === 0) {
    throw new Error("Manifest is empty, no versions available");
  }
  const latest = entries[entries.length - 1];
  return { version: latest.version, buildID: latest.buildID };
}

export function parseVersionInput(versionInput: string): { version: string; buildID: string } {
  const plusIndex = versionInput.lastIndexOf("+");
  if (plusIndex !== -1) {
    const version = versionInput.slice(0, plusIndex);
    const buildID = versionInput.slice(plusIndex + 1);
    return { version, buildID };
  }
  throw new Error(
    `Invalid version format: "${versionInput}". ` +
      'Expected format like "7.1-beta.39+0acfcd3f9" (version+buildID).',
  );
}

export async function fetchManifest(channel: string, platform: string): Promise<ManifestEntry[]> {
  const url =
    MANIFEST_BASE_URL +
    MANIFEST_PATH_TEMPLATE.replace("{channel}", channel).replace("{platform}", platform);

  core.info(`Fetching manifest from: ${url}`);

  const client = new HttpClient("action-setup-zotero");
  const response = await client.get(url);

  if (response.message.statusCode !== 200) {
    throw new Error(`Failed to fetch manifest: HTTP ${response.message.statusCode} from ${url}`);
  }

  const body = await response.readBody();
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(`Failed to parse manifest JSON from ${url}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Unexpected manifest format from ${url}: expected an array`);
  }

  for (const entry of parsed) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Record<string, unknown>).version !== "string" ||
      typeof (entry as Record<string, unknown>).buildID !== "string"
    ) {
      throw new Error(`Invalid manifest entry: missing version or buildID`);
    }
  }

  return parsed as ManifestEntry[];
}
