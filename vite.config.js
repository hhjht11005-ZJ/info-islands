const fs = require("node:fs");
const path = require("node:path");
const { defineConfig } = require("vite");

function copyVendorFallback() {
  let rootDir = process.cwd();
  let outDir = "dist";
  return {
    name: "copy-vendor-fallback",
    configResolved(config) {
      rootDir = config.root;
      outDir = config.build.outDir;
    },
    closeBundle() {
      const src = path.resolve(rootDir, "vendor", "chart.umd.min.js");
      const destDir = path.resolve(rootDir, outDir, "vendor");
      if (fs.existsSync(src)) {
        fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(src, path.join(destDir, "chart.umd.min.js"));
      }
    }
  };
}

module.exports = defineConfig({
  base: "./",
  build: {
    chunkSizeWarningLimit: 2000
  },
  plugins: [copyVendorFallback()]
});
