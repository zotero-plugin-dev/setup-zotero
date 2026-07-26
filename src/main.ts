import * as core from "@actions/core";
import * as os from "node:os";
import * as path from "node:path";
import { detectPlatform, getZoteroBinPath } from "./platforms";
import { fetchLatestVersion } from "./manifest";
import { computeCacheKey, restoreCache, saveCache } from "./cache";
import { installZotero } from "./install";
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

  core.startGroup("Resolve version");
  const version = versionInput || (await fetchLatestVersion(channel, platform));
  core.info(`Resolved version: ${version}`);
  core.endGroup();

  const tmpDir = process.env.RUNNER_TEMP || os.tmpdir();
  const cacheDir = path.join(tmpDir, "setup-zotero");
  const installerDir = path.join(cacheDir, "installer");
  const programDir = path.join(cacheDir, version);
  const cacheKey = computeCacheKey(platform, channel, version);

  let cacheHit = false;
  if (useCache) {
    core.startGroup("Restore cache");
    const restored = await restoreCache(cacheKey, [installerDir, programDir]);
    if (restored) cacheHit = true;
    core.info(cacheHit ? "Cache hit, skipping download" : "Cache miss");
    core.endGroup();
  }

  if (!cacheHit) {
    core.startGroup("Install Zotero");
    await installZotero(platform, channel, version, installerDir, programDir);
    core.endGroup();
  }

  const binPath = getZoteroBinPath(programDir, platform);
  core.info(`Zotero binary: ${binPath}`);

  if (platform.startsWith("linux")) {
    core.startGroup("Setup headless display");
    await setupHeadless();
    core.endGroup();
  }

  core.saveState("is_post", "true");
  core.saveState("cacheHit", cacheHit.toString());
  core.saveState("cacheKey", cacheKey);
  core.saveState("cachePaths", JSON.stringify([installerDir, programDir]));
  core.saveState("useCache", useCache.toString());

  core.setOutput("cache-hit", cacheHit ? "true" : "false");
  core.setOutput("zotero-version", version);
  core.setOutput("zotero-bin-path", binPath);
  core.setOutput("zotero-platform", platform);
  core.setOutput("zotero-channel", channel);

  // For zotero-plugin-scaffold compatibility
  core.exportVariable("ZOTERO_PLUGIN_ZOTERO_BIN_PATH", binPath);
  core.exportVariable("ZOTERO_BIN_PATH", binPath);
  core.exportVariable("ZOTERO_VERSION", version);
  core.exportVariable("ZOTERO_SETUP_COMPLETE", "true");
}

async function runPost(): Promise<void> {
  core.startGroup("Save cache");
  const cacheHit = core.getState("cacheHit") === "true";
  const useCache = core.getState("useCache") === "true";

  if (!cacheHit && useCache) {
    const cacheKey = core.getState("cacheKey");
    const cachePaths = JSON.parse(core.getState("cachePaths"));
    await saveCache(cacheKey, cachePaths);
    core.info(`Cache saved with key: ${cacheKey}`);
  } else {
    core.info(cacheHit ? "Cache hit, skipping save" : "Cache disabled, skipping save");
  }
  core.endGroup();
}

run().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : "";

  await core.summary
    .addHeading("Setup Zotero Failed", 2)
    .addCodeBlock(message, "text")
    .addRaw("<details><summary>Stack trace</summary>\n\n")
    .addCodeBlock(stack || "(none)", "text")
    .addRaw("\n</details>")
    .write();

  core.setFailed(message);
});
