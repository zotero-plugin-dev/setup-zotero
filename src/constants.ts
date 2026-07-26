export const MANIFEST_BASE_URL = "https://www.zotero.org/download/client/";
export const MANIFEST_PATH_TEMPLATE = "manifests/{channel}/updates-{platform}.json";

export const PLATFORMS = ["mac", "win-x64", "win-arm64", "linux-x86_64", "linux-i686"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const CHANNELS = ["release", "beta", "dev"] as const;
export type Channel = (typeof CHANNELS)[number];

export const PLATFORM_INSTALLER_SUFFIX: Record<string, string> = {
  "win-x64": "_setup.exe",
  "win-arm64": "_setup.exe",
  mac: ".dmg",
  "linux-x86_64": "_linux-x86_64.tar.bz2",
  "linux-i686": "_linux-i686.tar.bz2",
};
