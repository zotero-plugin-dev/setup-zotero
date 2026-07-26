# action-setup-zotero 设计文档

> 交接文档 · 版本 v2.0 · 2026-07-26

---

## 1. 项目概述

创建一个 GitHub Action，在 CI 环境中自动下载并设置 Zotero，供 `zotero-plugin-scaffold` 等下游工具进行插件开发、测试和构建。

**需求来源**：[zotero-plugin-scaffold#126](https://github.com/zotero-plugin-dev/zotero-plugin-scaffold/issues/126)

**核心能力**：

- 从 Zotero 官方 update manifest 获取最新版本号和 buildID
- 以 `zotero-{platform}-{channel}-{version}-{buildID}` 为 cache key 缓存安装包和解压后的程序文件
- 支持 `release`、`beta`、`dev` 三个 channel
- 支持 Windows / macOS / Linux 三个平台
- Linux 上自动安装和配置 Xvfb 虚拟显示服务
- 导出 `ZOTERO_PLUGIN_ZOTERO_BIN_PATH` 环境变量，与 scaffold 无缝对接

---

## 2. 技术栈

| 层级          | 选型                                                                                              | 理由                                                   |
| ------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Action 类型   | **JavaScript Action** (`node20`)                                                                  | 需要 HTTP 请求、JSON 解析、`@actions/cache` 等编程能力 |
| 包管理器      | **pnpm**                                                                                          | 与 `zotero-plugin-dev` org 内其他项目统一              |
| 构建          | **Vite+ / `vp pack`** (tsdown + Rolldown)                                                         | Rust 原生 bundler，比 webpack/ncc 快 40×               |
| 测试          | **Vite+ / `vp test`** (Vitest)                                                                    | 零配置，原生 TS/ESM                                    |
| Lint + 格式化 | **Vite+ / `vp check`** (Oxlint + Oxfmt)                                                           | Rust 实现，比 ESLint/Prettier 快 50-100×               |
| 类型检查      | **Vite+ / `vp check`** (tsgo)                                                                     | Rust 版 TypeScript 类型检查器，内置 TS7                |
| 运行时依赖    | `@actions/core`, `@actions/cache`, `@actions/tool-cache`, `@actions/http-client`, `@actions/exec` | GitHub Actions 官方工具包                              |

**全局配置集中在一个文件**：`vite.config.ts`，不再有 `vitest.config.ts`、`tsdown.config.ts`、`.eslintrc`、`.prettierrc`。

---

## 3. 项目结构

```
action-setup-zotero/
├── .github/
│   └── workflows/
│       └── check-dist.yml          # CI：确保 dist/ 与源码同步
├── src/
│   ├── main.ts                     # 主入口（action 执行入口）
│   ├── post.ts                     # post-action 入口（缓存保存）
│   ├── constants.ts                # 常量定义
│   ├── manifest.ts                 # 获取 & 解析 Zotero update manifest
│   ├── platforms.ts                # 平台检测、下载 URL 构造、二进制路径
│   ├── cache.ts                    # 缓存 key 计算、restore/save 封装
│   ├── downloader.ts              # 下载安装包 & 解压程序文件
│   └── headless.ts                # Linux Xvfb 安装与启动
├── __tests__/
│   ├── manifest.test.ts
│   └── platforms.test.ts
├── dist/                           # 构建产物（必须提交到 git）
│   ├── main/index.js
│   └── post/index.js
├── action.yml                      # Action 元数据
├── vite.config.ts                  # Vite+ 统一配置
├── tsconfig.json
├── package.json
├── .gitignore
├── LICENSE
└── README.md
```

---

## 4. 配置文件详情

### 4.1 `package.json`

```json
{
  "name": "action-setup-zotero",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.9.0",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "vp pack",
    "dev": "vp pack --watch",
    "test": "vp test",
    "check": "vp check",
    "check:fix": "vp check --fix"
  },
  "dependencies": {
    "@actions/core": "^1.11.0",
    "@actions/cache": "^4.0.0",
    "@actions/tool-cache": "^2.0.0",
    "@actions/http-client": "^2.2.0",
    "@actions/exec": "^1.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "vite-plus": "^0.14.0"
  }
}
```

**说明**：

- `engines.node` 管理 Node 版本（替代 `.node-version`），Vite+ 的 `vp env` 可读取此字段
- `dependencies` 中的 `@actions/*` 打包时会被 bundler 打入 `dist/`（通过 `deps.alwaysBundle` 强制 bundle）
- `vite-plus` 是唯一的 devDependency，内置 Vite 8、Vitest 4.x、tsdown、Oxlint、Oxfmt、tsgo (TS7)
- 不需要单独安装 `typescript`、`prettier`、`eslint`、`jest`、`vitest`

### 4.2 `vite.config.ts`

```ts
import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: {
      "main/index": "src/main.ts",
      "post/index": "src/post.ts",
    },
    format: ["cjs"],
    sourcemap: true,
    dts: false,
    clean: true,
    target: "node20",
    deps: {
      // tsdown 默认将 package.json dependencies 设为 external（给 library 用的）
      // GitHub Action 需要 self-contained bundle，所以强制将 @actions/* 打入 dist
      alwaysBundle: [/^@actions\//],
    },
  },
  test: {
    include: ["__tests__/**/*.test.ts"],
    environment: "node",
  },
});
```

**`deps.alwaysBundle` 说明**：tsdown 默认行为是将 `dependencies` 中的包 externalize——这是 library 的正常行为。但 GitHub Action 的 dist 文件是独立运行的，runner 不会执行 `npm install`，所以必须将 `@actions/*` 打入 bundle。`alwaysBundle: [/^@actions\//]` 指示 tsdown 强制 bundle 所有匹配该 pattern 的依赖。

### 4.3 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

此文件供 IDE 和 `vp check`（tsgo）进行类型检查。构建时 tsdown 通过 Rolldown 有独立的 transpilation 管线，不依赖 tsc。

### 4.4 `action.yml`

```yaml
name: "Setup Zotero"
description: "Download and setup Zotero for plugin development and testing"
author: "zotero-plugin-dev"

inputs:
  zotero-version:
    description: |
      Zotero version to install.
      For release: e.g. "7.0.0"
      For beta/dev: "7.1-beta.39+0acfcd3f9"
      Omit to use the latest version from the update manifest.
    required: false
  channel:
    description: "Release channel: release, beta, or dev"
    required: false
    default: "release"
  architecture:
    description: |
      Target platform/architecture.
      Auto-detected from runner if not specified.
      One of: mac, win-x64, win-arm64, linux-x86_64, linux-i686
    required: false
  cache:
    description: "Whether to use GitHub Actions cache"
    required: false
    default: "true"

outputs:
  cache-hit:
    description: "Whether Zotero was restored from cache"
  zotero-version:
    description: "The installed Zotero version"
  zotero-build-id:
    description: "The installed Zotero build ID"
  zotero-path:
    description: "Path to the Zotero program directory"
  zotero-bin-path:
    description: "Path to the Zotero executable (for zotero-plugin-scaffold)"
  zotero-platform:
    description: "The resolved platform identifier"
  zotero-channel:
    description: "The resolved channel (release/beta/dev)"

runs:
  using: "node20"
  main: "dist/main/index.js"
  post: "dist/post/index.js"
  post-if: success()

branding:
  icon: "download"
  color: "red"
```

### 4.5 `.gitignore`

```
node_modules/
.vite-hooks/
```

### 4.6 `.github/workflows/check-dist.yml`

```yaml
name: Check dist/

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check-dist:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: voidzero-dev/setup-vp@v1
      - run: vp install
      - run: vp pack
      - name: Verify dist/ is up to date
        run: |
          if git diff --quiet -- dist/; then
            echo "dist/ is up to date"
          else
            echo "dist/ is stale. Run 'vp pack' and commit the changes."
            git diff -- dist/
            exit 1
          fi
```

---

## 5. 核心逻辑设计

### 5.1 整体流程

```
用户调用 action-setup-zotero
        │
        ▼
   main.ts 执行
        │
  ┌─────┴─────┐
  │ 1. 解析输入  │  zotero-version, channel, architecture, cache
  └─────┬─────┘
        │
  ┌─────┴─────┐
  │ 2. 平台检测  │  runner.os + runner.arch → win-x64 / mac / linux-x86_64 等
  └─────┬─────┘
        │
  ┌─────┴─────┐
  │ 3. 版本解析  │  若用户指定 → 直接使用
  │             │  若未指定 → 请求 manifest JSON，取数组最后一项（最新）
  └─────┬─────┘
        │
  ┌─────┴─────┐
  │ 4. Linux   │  若 platform 为 linux-*：
  │   Headless │    安装 xvfb → 启动 Xvfb → 设置 DISPLAY
  └─────┬─────┘
        │
  ┌─────┴─────┐
  │ 5. 缓存查找  │  key = zotero-{platform}-{channel}-{version}-{buildID}
  └─────┬─────┘
        │
   ┌────┴────┐
  [HIT]    [MISS]
   │         │
   ▼         ▼
 恢复    6. 构造下载 URL
 缓存    7. 下载安装包到临时目录
   │     8. 按平台解压程序文件
   │     9.（post 阶段）保存缓存
   │         │
   └────┬────┘
        │
  ┌─────┴─────┐
  │ 10. 设置   │  outputs: cache-hit, zotero-version, zotero-bin-path 等
  │   输出/环境 │  env: ZOTERO_PLUGIN_ZOTERO_BIN_PATH, ZOTERO_PATH, ZOTERO_VERSION
  │            │  env (Linux): DISPLAY=:99
  └───────────┘
```

### 5.2 模块职责

#### `src/constants.ts`

```ts
export const MANIFEST_BASE_URL = "https://www.zotero.org/download/client/";
export const MANIFEST_PATH_TEMPLATE = "manifests/{channel}/updates-{platform}.json";

export const PLATFORMS = ["mac", "win-x64", "win-arm64", "linux-x86_64", "linux-i686"] as const;
export const CHANNELS = ["release", "beta", "dev"] as const;

export const PLATFORM_INSTALLER_SUFFIX: Record<string, string> = {
  "win-x64": "_setup.exe",
  "win-arm64": "_setup.exe",
  mac: ".dmg",
  "linux-x86_64": "_linux-x86_64.tar.bz2",
  "linux-i686": "_linux-i686.tar.bz2",
};
```

#### `src/manifest.ts`

```ts
export interface ManifestEntry {
  version: string;
  buildID: string;
  detailsURL?: string;
  major?: string | null;
}

export function resolveVersion(
  userVersion: string | undefined,
  entries: ManifestEntry[],
): { version: string; buildID: string };

/** 从 URL 获取 manifest JSON，返回解析后的条目数组 */
export async function fetchManifest(channel: string, platform: string): Promise<ManifestEntry[]>;
```

**版本解析逻辑**：

- 若用户指定 `zotero-version`（如 `"7.1-beta.39+0acfcd3f9"`），从字符串中拆分 `version` 和 `buildID`
- 若未指定，通过 `GET {base}/manifests/{channel}/updates-{platform}.json` 获取清单，取数组最后一项（最新版本）

#### `src/platforms.ts`

```ts
/** 从 GitHub Actions runner 环境自动检测平台 */
export function detectPlatform(): string;

/** 根据平台返回 Zotero 可执行文件的路径 */
export function getZoteroBinPath(programDir: string, platform: string): string;

/** 构造 Zotero 下载 URL */
export function constructDownloadUrl(
  platform: string,
  channel: string,
  version: string,
  buildID: string,
): string;
```

**平台检测映射**：

| `RUNNER_OS` | `RUNNER_ARCH`   | 输出           |
| ----------- | --------------- | -------------- |
| `Windows`   | `X64`           | `win-x64`      |
| `Windows`   | `ARM64`         | `win-arm64`    |
| `macOS`     | `X64` / `ARM64` | `mac`          |
| `Linux`     | `X64`           | `linux-x86_64` |
| `Linux`     | `X86`           | `linux-i686`   |

**二进制路径**：

```ts
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
  }
}
```

**下载 URL 模式**（需在实现阶段验证）：

```
https://download.zotero.org/client/{channel}/{version}/Zotero-{version}_{suffix}
```

备选：使用 Zotero CDN 重定向链接：

```
https://www.zotero.org/download/client/dl?channel={c}&platform={p}&version={v}
```

#### `src/downloader.ts`

```ts
/** 下载安装包到指定目录，返回文件路径 */
export async function downloadInstaller(url: string, destDir: string): Promise<string>;

/** 解压 Zotero 程序文件，返回程序目录 */
export async function extractZotero(
  installerPath: string,
  platform: string,
  destDir: string,
): Promise<string>;
```

**平台解压策略**：

| 平台    | 安装包格式    | 解压方式                                                                         |
| ------- | ------------- | -------------------------------------------------------------------------------- |
| Windows | `.exe` (NSIS) | `@actions/tool-cache.extract7z`，fallback：`installer.exe /S /D={dest}`          |
| macOS   | `.dmg`        | `hdiutil attach` → `cp -R /Volumes/Zotero/Zotero.app {dest}/` → `hdiutil detach` |
| Linux   | `.tar.bz2`    | `@actions/tool-cache.extractTar`                                                 |

#### `src/cache.ts`

```ts
/** 计算缓存 key：zotero-{platform}-{channel}-{version}-{buildID} */
export function computeCacheKey(
  platform: string,
  channel: string,
  version: string,
  buildID: string,
): string;

/** 封装 @actions/cache.restoreCache，返回 cacheKey 或 undefined */
export async function restoreCache(key: string, paths: string[]): Promise<string | undefined>;

/** 封装 @actions/cache.saveCache，返回 cacheId */
export async function saveCache(key: string, paths: string[]): Promise<number>;
```

**Cache key 示例**：`zotero-win-x64-release-7.0.0-d6e67c6f2`

**缓存路径**（两个目录打包为一份缓存）：

- `{RUNNER_TEMP}/zotero-setup/installer/` — 安装包文件
- `{RUNNER_TEMP}/zotero-setup/{version}/` — 解压后的程序文件

GitHub Actions cache 限制：7 天未访问自动清除；每个 repo 默认 10 GB 上限。

#### `src/headless.ts`（仅 Linux）

```ts
/** 在 Linux runner 上安装 xvfb 并启动虚拟显示服务 */
export async function setupHeadless(): Promise<void>;
```

**内部逻辑**：

1. 检查当前 runner 系统是否为 Ubuntu/Debian（读取 `/etc/os-release`）
2. `apt update && apt install -y xvfb x11-xkb-utils xkb-data`
3. 若为 Ubuntu 24.04，额外安装 `libasound2t64 libdbus-glib-1-2`
4. 启动后台 Xvfb 进程：`Xvfb :99 -screen 0 1920x1080x24 -ac +extension RANDR &`
5. 设置 `process.env.DISPLAY = ':99'`（后续 step 均会继承）

**设计理由**——相比 `xvfb-run` 选择直接设置 `DISPLAY` 的原因：

| 维度          | `xvfb-run`                                                                    | 设置 `DISPLAY` + 后台 Xvfb                      |
| ------------- | ----------------------------------------------------------------------------- | ----------------------------------------------- |
| scaffold 兼容 | `binary.path` 必须是 `xvfb-run`，args 需拼装在 Zotero 路径前——scaffold 必须改 | `binary.path` 即是 Zotero 路径，scaffold 零改动 |
| 多进程        | 每次 spawn 创建独立 Xvfb 实例，多次重启会产生孤儿进程                         | 所有 Zotero 进程共享一个 Xvfb                   |
| 影响范围      | 仅对包装的那一条命令可见                                                      | job 中所有 step 的 X11 工具均可使用             |
| 生命周期      | 命令结束 Xvfb 自动终止（CI 环境不需要此特性）                                 | job 结束时 runner 自动清理所有子进程            |

#### `src/main.ts`

```ts
import * as core from "@actions/core";
import { detectPlatform, getZoteroBinPath, constructDownloadUrl } from "./platforms";
import { fetchManifest, resolveVersion } from "./manifest";
import { computeCacheKey, restoreCache } from "./cache";
import { downloadInstaller, extractZotero } from "./downloader";
import { setupHeadless } from "./headless";
import path from "node:path";

async function run(): Promise<void> {
  // 1. 解析输入
  const versionInput = core.getInput("zotero-version");
  const channel = core.getInput("channel") || "release";
  const archInput = core.getInput("architecture");
  const useCache = core.getInput("cache") !== "false";

  // 2. 平台检测
  const platform = archInput || detectPlatform();

  // 3. 版本解析
  let version: string, buildID: string;
  if (versionInput) {
    // 从 "7.1-beta.39+0acfcd3f9" 中拆分 version 和 buildID
    [version, buildID] = parseVersionInput(versionInput);
  } else {
    const manifest = await fetchManifest(channel, platform);
    const resolved = resolveVersion(undefined, manifest);
    version = resolved.version;
    buildID = resolved.buildID;
  }

  // 4. Linux Headless 环境准备
  if (platform.startsWith("linux")) {
    await setupHeadless();
  }

  // 5. 路径准备
  const tmpDir = process.env.RUNNER_TEMP || "/tmp";
  const cacheDir = path.join(tmpDir, "zotero-setup");
  const installerDir = path.join(cacheDir, "installer");
  const programDir = path.join(cacheDir, version);
  const cacheKey = computeCacheKey(platform, channel, version, buildID);

  // 6. 尝试恢复缓存
  let cacheHit = false;
  if (useCache) {
    const restored = await restoreCache(cacheKey, [installerDir, programDir]);
    if (restored) cacheHit = true;
  }

  // 7. 缓存未命中 → 下载 + 解压
  if (!cacheHit) {
    const url = constructDownloadUrl(platform, channel, version, buildID);
    core.info(`Downloading Zotero ${version} for ${platform} from: ${url}`);
    const installerPath = await downloadInstaller(url, installerDir);
    core.info(`Extracting Zotero to: ${programDir}`);
    await extractZotero(installerPath, platform, programDir);
  }

  // 8. 保存状态供 post 使用
  core.saveState("cacheHit", cacheHit.toString());
  core.saveState("cacheKey", cacheKey);
  core.saveState("cachePaths", JSON.stringify([installerDir, programDir]));

  // 9. 二进制路径
  const binPath = getZoteroBinPath(programDir, platform);

  // 10. 输出和导出环境变量
  core.setOutput("cache-hit", cacheHit ? "true" : "false");
  core.setOutput("zotero-version", version);
  core.setOutput("zotero-build-id", buildID);
  core.setOutput("zotero-path", programDir);
  core.setOutput("zotero-bin-path", binPath);
  core.setOutput("zotero-platform", platform);
  core.setOutput("zotero-channel", channel);

  core.exportVariable("ZOTERO_PLUGIN_ZOTERO_BIN_PATH", binPath);
  core.exportVariable("ZOTERO_PATH", programDir);
  core.exportVariable("ZOTERO_VERSION", version);
}

run().catch((error) => core.setFailed(error.message));
```

#### `src/post.ts`

```ts
import * as core from "@actions/core";
import { saveCache } from "./cache";

async function run(): Promise<void> {
  const cacheHit = core.getState("cacheHit") === "true";
  const useCache = core.getInput("cache") !== "false";

  if (!cacheHit && useCache) {
    const cacheKey = core.getState("cacheKey");
    const cachePaths = JSON.parse(core.getState("cachePaths"));
    await saveCache(cacheKey, cachePaths);
    core.info(`Cache saved with key: ${cacheKey}`);
  }
}

run().catch((error) => core.warning(error.message));
```

---

## 6. 与 zotero-plugin-scaffold 的对接

scaffold 在 `tester/headless.ts` 中已内置了完整的 headless 准备逻辑：

```ts
export async function prepareHeadless(): Promise<void> {
  await installXvfb(); // 1. apt install xvfb
  await installDepsForUbuntu24(); // 2. Ubuntu 24.04 额外依赖
  await installZoteroLinux(); // 3. 下载 Zotero（若 ZOTERO_PLUGIN_ZOTERO_BIN_PATH 已设则跳过）
  const xvfb = new Xvfb(); // 4. 启动 Xvfb 服务器
  await xvfb.start();
}
```

**使用 `action-setup-zotero` 后**，前 3 步已被 action 覆盖。后续 scaffold 可以检测到 `ZOTERO_PLUGIN_ZOTERO_BIN_PATH` 和 `DISPLAY` 均已设置，将整个 `prepareHeadless()` 变为空操作。此项 scaffold 适配不在本 action 范围内，但架构上已经为此做好了准备。

---

## 7. 消费者使用示例

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: zotero-plugin-dev/action-setup-zotero@v1
        id: zotero
        with:
          channel: release
      - run: echo "Zotero at ${{ steps.zotero.outputs.zotero-bin-path }}"
      - run: echo "Version ${{ steps.zotero.outputs.zotero-version }}"
```

---

## 8. 实施步骤

| 序号 | 任务                                                                                      | 产出                           |
| ---- | ----------------------------------------------------------------------------------------- | ------------------------------ |
| 1    | 初始化项目：`package.json`、`tsconfig.json`、`vite.config.ts`、`action.yml`、`.gitignore` | 项目骨架                       |
| 2    | 实现 `src/constants.ts`                                                                   | 常量定义                       |
| 3    | 实现 `src/platforms.ts`                                                                   | 平台检测、URL 构造、二进制路径 |
| 4    | 实现 `src/manifest.ts`                                                                    | HTTP 请求 + JSON 解析          |
| 5    | 实现 `src/cache.ts`                                                                       | cache key + restore/save 封装  |
| 6    | 实现 `src/headless.ts`                                                                    | Linux xvfb 安装与启动          |
| 7    | 实现 `src/downloader.ts`                                                                  | 下载 + 三平台解压              |
| 8    | 实现 `src/main.ts`                                                                        | 主流程组装                     |
| 9    | 实现 `src/post.ts`                                                                        | 缓存保存                       |
| 10   | 编写测试 `__tests__/manifest.test.ts`、`platforms.test.ts`                                | 单元测试                       |
| 11   | 配置 CI `check-dist.yml`                                                                  | 自检流水线                     |
| 12   | `vp install && vp check && vp test && vp pack`                                            | 验证通过                       |
| 13   | 在实际 Zotero 插件仓库中集成测试                                                          | 端到端验证                     |

---

## 9. 待验证 / 风险点

| #   | 风险                | 说明                                                                                                          |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Zotero CDN URL 模式 | beta/dev channel 的 URL 可能与 release 不同，需抓包验证；备选使用 `dl?channel=&platform=&version=` 重定向链接 |
| 2   | Windows NSIS 解压   | `/S /D=` 参数有效性待实测；备选 7zip 提取                                                                     |
| 3   | win-arm64 支持      | 需确认 Zotero 是否提供 Windows ARM64 版本                                                                     |
| 4   | Cache key 长度      | `@actions/cache` v4 对 key 长度有限制（512 字符），包含完整 buildID 是否超限？                                |
| 5   | Vite+ beta 阶段     | `vite-plus` 和 `setup-vp` 目前是 beta，需关注 Breaking changes                                                |
| 6   | macOS 通用二进制    | Zotero for Mac 是 universal binary，Intel 和 ARM 统一为 `mac`，无需区分                                       |
| 7   | 非 Ubuntu Linux     | 目前 `setupHeadless()` 仅支持 Ubuntu/Debian，其他发行版的 xvfb 安装命令不同                                   |

---

## 10. 版本发布

```bash
git tag v1.0.0
git tag v1            # 移动 major tag，消费者使用 @v1 时会自动拉取最新 minor
git push --tags
```

消费者引用：`uses: zotero-plugin-dev/action-setup-zotero@v1`
