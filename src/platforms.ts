import * as os from "node:os";
import * as path from "node:path";
import { PLATFORM_INSTALLER_SUFFIX } from "./constants";

export function detectPlatform(): string {
  const runnerOs = process.env.RUNNER_OS || os.platform();
  const runnerArch = process.env.RUNNER_ARCH || os.arch();

  switch (runnerOs) {
    case "Windows":
    case "win32":
      if (runnerArch === "ARM64" || runnerArch === "arm64") {
        return "win-arm64";
      }
      return "win-x64";
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
  switch (platform) {
    case "win-x64":
    case "win-arm64":
      return path.join(programDir, "zotero.exe");
    case "mac":
      return path.join(programDir, "Zotero.app", "Contents", "MacOS", "zotero");
    case "linux-x86_64":
    case "linux-i686":
      return path.join(programDir, "zotero");
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

export function constructDownloadUrl(
  platform: string,
  channel: string,
  version: string,
  buildID: string,
): string {
  const suffix = PLATFORM_INSTALLER_SUFFIX[platform];
  if (!suffix) {
    throw new Error(`Unknown platform: ${platform}`);
  }
  return `https://download.zotero.org/client/${channel}/${version}/Zotero-${version}_${buildID}${suffix}`;
}
