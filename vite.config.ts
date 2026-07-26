import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    ignorePatterns: ["dist/**"],
  },
  fmt: {
    ignorePatterns: ["dist/**"],
  },
  pack: {
    entry: {
      index: "src/main.ts",
    },
    format: ["esm"],
    sourcemap: false,
    dts: false,
    clean: true,
    target: "node24",
    hash: false,
    deps: {
      alwaysBundle: [/^@actions\//],
    },
    outputOptions: {
      entryFileNames: "[name].mjs",
      chunkFileNames: "shared/[name].mjs",
    },
  },
  test: {},
  staged: {
    "*.{js,ts,mjs,mts,cjs,cts,json,md,yml,yaml}": "vp check --fix",
  },
});
