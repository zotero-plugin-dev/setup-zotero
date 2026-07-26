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
      alwaysBundle: [/.*/],
      onlyBundle: false,
    },
    outputOptions: {
      entryFileNames: "[name].mjs",
      chunkFileNames: "shared/[name].mjs",
    },
    // `rolldown` will output the path to the source file, and the
    // package paths parsed by `pnpm` vary across different platforms.
    // Therefore, we need to remove the comments.
    minify: {
      // https://github.com/voidzero-dev/setup-vp/blob/591ba1cda1a8dab129513ee3f9bd99e77f9be4d6/vite.config.ts#L22-L27
      compress: true,
      mangle: { keepNames: { function: true, class: true } },
    },
    // plugins: [
    //   {
    //     name: "strip-region-comments",
    //     renderChunk(code) {
    //       return code.replace(/\/\/#(?:end)?region\s+.*\n/g, "");
    //     },
    //   },
    // ],
  },
  test: {},
  staged: {
    "*.{js,ts,mjs,mts,cjs,cts,json,md,yml,yaml}": "vp check --fix",
  },
});
