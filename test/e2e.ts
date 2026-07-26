import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import * as path from "node:path";

const INPUTS: Record<string, string> = {
  channel: "release",
  // cache: "false", // 本地测试可关闭缓存加速
};

const platform = process.platform;
const arch = process.arch;

const env: Record<string, string> = {
  ...process.env,
  RUNNER_TEMP: process.env.RUNNER_TEMP || path.join(process.cwd(), ".tmp"),
  INPUT_CHANNEL: INPUTS.channel,
};

// 仅在指定时设置，否则让 action 自动检测
if (INPUTS["zotero-version"]) env.INPUT_ZOTERO_VERSION = INPUTS["zotero-version"];
if (INPUTS.cache) env.INPUT_CACHE = INPUTS.cache;

console.log(`Platform: ${platform} ${arch}`);
console.log(`Inputs: ${JSON.stringify(INPUTS)}`);
console.log("");

const mainScript = path.join(process.cwd(), "dist", "index.mjs");

if (!existsSync(mainScript)) {
  console.error("dist/index.mjs not found. Run `pnpm build` first.");
  process.exit(1);
}

const child = spawn("node", [mainScript], {
  env,
  stdio: "inherit",
});

child.on("close", (code) => {
  if (code === 0) {
    console.log("\nE2E test passed");
  } else {
    console.error(`\nE2E test failed with code ${code}`);
  }
  process.exit(code ?? 1);
});
