import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: "src/cli/main.ts",
    format: ["esm"],
    dts: true,
    clean: true,
    outDir: "dist/cli",
  },
});
