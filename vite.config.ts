import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: {
      index: "src/main.ts",
    },
    format: ["esm"],
    sourcemap: false,
    dts: false,
    clean: true,
    target: "node20",
    hash: false,
    deps: {
      alwaysBundle: [/^@actions\//],
    },
    outputOptions: {
      entryFileNames: "[name].mjs",
      chunkFileNames: "shared/[name].mjs",
    },
  },
  test: {
    include: ["__tests__/**/*.test.ts"],
    environment: "node",
  },
});
