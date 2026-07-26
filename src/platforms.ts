import * as os from "node:os";
import * as path from "node:path";
import { DOWNLOAD_URL_TEMPLATE, DOWNLOAD_URL_VERSION_TEMPLATE } from "./constants";

export function detectPlatform(): string {
  const runnerOs = process.env.RUNNER_OS || os.platform();
  const runnerArch = process.env.RUNNER_ARCH || os.arch();

  switch (runnerOs) {
    case "Windows":
    case "win32":
      if (runnerArch === "ARM64" || runnerArch === "arm64") {
        return "win-arm64-zip";
      }
      return "win-x64-zip";
    case "macOS":
    case "darwin":
      return "mac";
    case "Linux":
    case "linux":
      if (runnerArch === "X86" || runnerArch === "ia32") {
        return "linux-i686";
      }
      return "linux-x86_64";
    default:
      throw new Error(`Unsupported platform: ${runnerOs} (arch: ${runnerArch})`);
  }
}

export function getZoteroBinPath(programDir: string, platform: string): string {
  if (platform.startsWith("win")) {
    return path.join(programDir, "zotero.exe");
  }
  switch (platform) {
    case "mac":
      return path.join(programDir, "Zotero.app", "Contents", "MacOS", "zotero");
    case "linux-x86_64":
    case "linux-i686":
      return path.join(programDir, "zotero");
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

export function constructDownloadUrl(platform: string, channel: string, version?: string): string {
  const template = version ? DOWNLOAD_URL_VERSION_TEMPLATE : DOWNLOAD_URL_TEMPLATE;
  let url = template.replace("{channel}", channel).replace("{platform}", platform);
  if (version) url = url.replace("{version}", version);
  return url;
}
