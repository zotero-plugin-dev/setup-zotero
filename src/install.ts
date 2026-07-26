import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as toolCache from "@actions/tool-cache";
import * as fs from "node:fs";
import * as path from "node:path";
import { DOWNLOAD_URL_TEMPLATE, DOWNLOAD_URL_VERSION_TEMPLATE } from "./constants";

export function constructDownloadUrl(platform: string, channel: string, version?: string): string {
  const dlPlatform = platform.startsWith("win") ? `${platform}-zip` : platform;
  const template = version ? DOWNLOAD_URL_VERSION_TEMPLATE : DOWNLOAD_URL_TEMPLATE;
  let url = template.replace("{channel}", channel).replace("{platform}", dlPlatform);
  if (version) url = url.replace("{version}", encodeURIComponent(version));
  return url;
}

async function downloadInstaller(url: string, destDir: string): Promise<string> {
  fs.mkdirSync(destDir, { recursive: true });

  const destPath = resolveDestPath(url, destDir);

  if (fs.existsSync(destPath)) {
    core.info(`Installer already exists at: ${destPath}`);
    return destPath;
  }

  core.info(`Downloading ${url}`);
  const downloadedPath = await toolCache.downloadTool(url, destPath);
  core.info(`Downloaded to: ${downloadedPath}`);
  return downloadedPath;
}

function resolveDestPath(url: string, destDir: string): string {
  const platMatch = url.match(/[?&]platform=([^&]+)/);
  const chanMatch = url.match(/[?&]channel=([^&]+)/);
  const platform = platMatch ? platMatch[1] : "";
  const channel = chanMatch ? chanMatch[1] : "";

  const name = channel ? `Zotero-${channel}` : "Zotero";
  if (platform === "mac") return path.join(destDir, `${name}.dmg`);
  if (platform.startsWith("win")) return path.join(destDir, `${name}.zip`);
  if (platform.startsWith("linux")) return path.join(destDir, `${name}.tar.xz`);
  return path.join(destDir, `${name}-installer`);
}

async function extractWindows(installerPath: string, destDir: string): Promise<string> {
  fs.mkdirSync(destDir, { recursive: true });
  core.info("Extracting ZIP...");
  await toolCache.extractZip(installerPath, destDir);
  core.info("ZIP extraction succeeded");
  flattenZoteroCoreDir(destDir);
  return destDir;
}

async function extractMacOS(installerPath: string, destDir: string): Promise<string> {
  fs.mkdirSync(destDir, { recursive: true });

  core.info("Mounting DMG...");

  let mountOutput = "";
  await exec.exec("hdiutil", ["attach", installerPath, "-nobrowse", "-readonly"], {
    listeners: {
      stdout: (data: Buffer) => {
        mountOutput += data.toString();
      },
    },
  });

  let mountPoint = "";
  const lines = mountOutput.split("\n");
  for (const line of lines) {
    const volMatch = line.match(/\/Volumes\/[^\s]+/);
    if (volMatch) {
      mountPoint = volMatch[0];
      break;
    }
  }

  if (!mountPoint) {
    throw new Error("Could not find DMG mount point");
  }

  core.info(`Mounted at: ${mountPoint}`);
  const appDir = path.join(mountPoint, "Zotero.app");
  const destAppDir = path.join(destDir, "Zotero.app");

  if (fs.existsSync(destAppDir)) {
    fs.rmSync(destAppDir, { recursive: true, force: true });
  }

  await exec.exec("cp", ["-R", appDir, `${destDir}/`]);
  await exec.exec("hdiutil", ["detach", mountPoint]);
  core.info("DMG detached");

  return destDir;
}

async function extractLinux(installerPath: string, destDir: string): Promise<string> {
  fs.mkdirSync(destDir, { recursive: true });

  core.info("Extracting Zotero archive...");
  await toolCache.extractTar(installerPath, destDir, "xJ");

  flattenZoteroCoreDir(destDir);
  return destDir;
}

function findZoteroCoreDir(baseDir: string): string | null {
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      entry.name.toLowerCase().startsWith("zotero") &&
      !entry.name.endsWith(".app")
    ) {
      return path.join(baseDir, entry.name);
    }
  }
  return null;
}

function flattenZoteroCoreDir(baseDir: string): void {
  const coreDir = findZoteroCoreDir(baseDir);
  if (!coreDir) return;
  for (const entry of fs.readdirSync(coreDir)) {
    const src = path.join(coreDir, entry);
    const dst = path.join(baseDir, entry);
    fs.cpSync(src, dst, { recursive: true, force: true });
    try {
      fs.rmSync(src, { recursive: true, force: true });
    } catch {
      // Windows may hold file handles briefly after extraction
    }
  }
  try {
    fs.rmSync(coreDir, { recursive: true, force: true });
  } catch {
    // Windows may hold file handles briefly after extraction
  }
}

export async function installZotero(
  platform: string,
  channel: string,
  version: string,
  installerDir: string,
  programDir: string,
): Promise<void> {
  const url = constructDownloadUrl(platform, channel, version);

  core.startGroup("Download");
  core.info(`Downloading Zotero ${version} from: ${url}`);
  const installerPath = await downloadInstaller(url, installerDir);
  core.endGroup();

  core.startGroup("Extract");
  core.info(`Extracting Zotero to: ${programDir}`);
  await extractZotero(installerPath, platform, programDir);
  core.endGroup();
}

async function extractZotero(
  installerPath: string,
  platform: string,
  destDir: string,
): Promise<string> {
  core.info(`Extracting Zotero for platform: ${platform}`);

  if (platform.startsWith("win")) {
    return extractWindows(installerPath, destDir);
  }
  switch (platform) {
    case "mac":
      return extractMacOS(installerPath, destDir);
    case "linux-x86_64":
    case "linux-i686":
      return extractLinux(installerPath, destDir);
    default:
      throw new Error(`Unsupported platform for extraction: ${platform}`);
  }
}
