export const VERSION_API_URL = "https://www.zotero.org/download/client/version";

export const DOWNLOAD_URL_TEMPLATE =
  "https://www.zotero.org/download/client/dl?channel={channel}&platform={platform}";

export const DOWNLOAD_URL_VERSION_TEMPLATE =
  "https://www.zotero.org/download/client/dl?channel={channel}&platform={platform}&version={version}";

export const PLATFORMS = [
  "mac",
  "win-x64-zip",
  "win-arm64-zip",
  "linux-x86_64",
  "linux-i686",
] as const;
export type Platform = (typeof PLATFORMS)[number];

export const CHANNELS = ["release", "beta", "dev"] as const;
export type Channel = (typeof CHANNELS)[number];
