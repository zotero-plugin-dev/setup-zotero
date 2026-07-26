import * as cache from "@actions/cache";
import * as core from "@actions/core";

export function computeCacheKey(
  platform: string,
  channel: string,
  version: string,
  buildID: string,
): string {
  return `zotero-${platform}-${channel}-${version}-${buildID}`;
}

export async function restoreCache(key: string, paths: string[]): Promise<string | undefined> {
  core.info(`Looking up cache with key: ${key}`);
  try {
    const cacheKey = await cache.restoreCache(paths, key);
    if (cacheKey) {
      core.info(`Cache restored with key: ${cacheKey}`);
      return cacheKey;
    }
    core.info("Cache miss");
    return undefined;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    core.warning(`Cache restore failed: ${msg}`);
    return undefined;
  }
}

export async function saveCache(key: string, paths: string[]): Promise<number> {
  core.info(`Saving cache with key: ${key}`);
  try {
    const cacheId = await cache.saveCache(paths, key);
    core.info(`Cache saved with id: ${cacheId}`);
    return cacheId;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    core.warning(`Cache save failed: ${msg}`);
    return -1;
  }
}
