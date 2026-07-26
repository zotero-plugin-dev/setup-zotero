import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as toolCache from "@actions/tool-cache";
import * as fs from "node:fs";
import * as path from "node:path";

export async function downloadInstaller(url: string, destDir: string): Promise<string> {
  fs.mkdirSync(destDir, { recursive: true });

  const fileName = url.split("/").pop() || "zotero-installer";
  const destPath = path.join(destDir, fileName);

  if (fs.existsSync(destPath)) {
    core.info(`Installer already exists at: ${destPath}`);
    return destPath;
  }

  core.info(`Downloading ${url}`);
  const downloadedPath = await toolCache.downloadTool(url, path.join(destDir, "zotero-download"));
  const finalPath = path.join(destDir, fileName);
  fs.renameSync(downloadedPath, finalPath);
  core.info(`Downloaded to: ${finalPath}`);
  return finalPath;
}

async function extractWindows(installerPath: string, destDir: string): Promise<string> {
  fs.mkdirSync(destDir, { recursive: true });

  try {
    core.info("Attempting 7z extraction for Windows installer...");
    await toolCache.extract7z(installerPath, destDir);
    core.info("7z extraction succeeded");
  } catch {
    core.info("7z extraction failed, trying NSIS silent install...");
    await exec.exec(installerPath, ["/S", `/D=${destDir}`, "/NCRC"]);
  }

  const coreDir = findZoteroCoreDir(destDir, "win");
  return coreDir || destDir;
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

  core.info("Extracting tar.bz2...");
  const extracted = await toolCache.extractTar(installerPath, destDir);

  const coreDir = findZoteroCoreDir(destDir, "linux");
  return coreDir || extracted;
}

function findZoteroCoreDir(baseDir: string, _platform: "win" | "linux"): string | null {
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.toLowerCase().startsWith("zotero")) {
      return path.join(baseDir, entry.name);
    }
  }
  return null;
}

export async function extractZotero(
  installerPath: string,
  platform: string,
  destDir: string,
): Promise<string> {
  core.info(`Extracting Zotero for platform: ${platform}`);

  switch (platform) {
    case "win-x64":
    case "win-arm64":
      return extractWindows(installerPath, destDir);
    case "mac":
      return extractMacOS(installerPath, destDir);
    case "linux-x86_64":
    case "linux-i686":
      return extractLinux(installerPath, destDir);
    default:
      throw new Error(`Unsupported platform for extraction: ${platform}`);
  }
}
