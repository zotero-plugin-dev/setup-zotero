import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as fs from "node:fs";
import { spawn } from "node:child_process";

async function isUbuntu(): Promise<boolean> {
  try {
    const osRelease = fs.readFileSync("/etc/os-release", "utf-8");
    return osRelease.includes("ID=ubuntu") || osRelease.includes("ID_LIKE=ubuntu");
  } catch {
    return false;
  }
}

async function getUbuntuVersion(): Promise<string | null> {
  try {
    const osRelease = fs.readFileSync("/etc/os-release", "utf-8");
    const match = osRelease.match(/VERSION_ID="?(\d+\.\d+)"?/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function setupHeadless(): Promise<void> {
  if (!(await isUbuntu())) {
    core.warning("Non-Ubuntu Linux detected, skipping Xvfb installation");
    return;
  }

  core.info("Updating apt package lists...");
  await exec.exec("sudo", ["apt-get", "update"]);

  core.info("Installing Xvfb and dependencies...");
  await exec.exec("sudo", ["apt-get", "install", "-y", "xvfb", "x11-xkb-utils", "xkb-data"]);

  const ubuntuVersion = await getUbuntuVersion();
  if (ubuntuVersion && ubuntuVersion.startsWith("24")) {
    core.info("Ubuntu 24.04 detected, installing additional dependencies...");
    await exec.exec("sudo", ["apt-get", "install", "-y", "libasound2t64", "libdbus-glib-1-2"]);
  }

  core.info("Starting Xvfb on display :99...");
  const xvfb = spawn(
    "Xvfb",
    [":99", "-screen", "0", "1920x1080x24", "-ac", "+extension", "RANDR"],
    {
      detached: true,
      stdio: "ignore",
    },
  );
  xvfb.unref();
  core.exportVariable("DISPLAY", ":99");
  core.info("Xvfb started, DISPLAY=:99");
}
