import * as core from "@actions/core";
import * as os from "node:os";
import * as path from "node:path";
import { detectPlatform, getZoteroBinPath, constructDownloadUrl } from "./platforms";
import { fetchLatestVersion } from "./manifest";
import { computeCacheKey, restoreCache, saveCache } from "./cache";
import { downloadInstaller, extractZotero } from "./downloader";
import { setupHeadless } from "./headless";

async function run(): Promise<void> {
  if (core.getState("is_post") === "true") {
    await runPost();
    return;
  }
  await runMain();
}

async function runMain(): Promise<void> {
  const versionInput = core.getInput("zotero-version");
  const channel = core.getInput("channel") || "release";
  const archInput = core.getInput("architecture");
  const useCache = core.getInput("cache") !== "false";

  const platform = archInput || detectPlatform();
  core.info(`Platform: ${platform}, Channel: ${channel}`);

  const version = versionInput || (await fetchLatestVersion(platform));
  core.info(`Version: ${version}`);

  if (platform.startsWith("linux")) {
    await setupHeadless();
  }

  const tmpDir = process.env.RUNNER_TEMP || os.tmpdir();
  const cacheDir = path.join(tmpDir, "setup-zotero");
  const installerDir = path.join(cacheDir, "installer");
  const programDir = path.join(cacheDir, version);
  const cacheKey = computeCacheKey(platform, channel, version);

  let cacheHit = false;
  if (useCache) {
    const restored = await restoreCache(cacheKey, [installerDir, programDir]);
    if (restored) cacheHit = true;
  }

  if (!cacheHit) {
    const url = constructDownloadUrl(platform, channel, version);
    core.info(`Downloading Zotero ${version} from: ${url}`);
    const installerPath = await downloadInstaller(url, installerDir);
    core.info(`Extracting Zotero to: ${programDir}`);
    await extractZotero(installerPath, platform, programDir);
  }

  core.saveState("is_post", "true");
  core.saveState("cacheHit", cacheHit.toString());
  core.saveState("cacheKey", cacheKey);
  core.saveState("cachePaths", JSON.stringify([installerDir, programDir]));
  core.saveState("useCache", useCache.toString());

  const binPath = getZoteroBinPath(programDir, platform);

  core.setOutput("cache-hit", cacheHit ? "true" : "false");
  core.setOutput("zotero-version", version);
  core.setOutput("zotero-path", programDir);
  core.setOutput("zotero-bin-path", binPath);
  core.setOutput("zotero-platform", platform);
  core.setOutput("zotero-channel", channel);

  core.exportVariable("ZOTERO_PLUGIN_ZOTERO_BIN_PATH", binPath);
  core.exportVariable("ZOTERO_PATH", programDir);
  core.exportVariable("ZOTERO_VERSION", version);
}

async function runPost(): Promise<void> {
  const cacheHit = core.getState("cacheHit") === "true";
  const useCache = core.getState("useCache") === "true";

  if (!cacheHit && useCache) {
    const cacheKey = core.getState("cacheKey");
    const cachePaths = JSON.parse(core.getState("cachePaths"));
    await saveCache(cacheKey, cachePaths);
    core.info(`Cache saved with key: ${cacheKey}`);
  }
}

run().catch((error) => core.setFailed(error.message));
