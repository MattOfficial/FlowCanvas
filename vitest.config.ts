import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@flownote/core-geometry": path.resolve(__dirname, "packages/core-geometry/src/index.ts"),
      "@flownote/command-history": path.resolve(__dirname, "packages/command-history/src/index.ts"),
      "@flownote/diagram-core": path.resolve(__dirname, "packages/diagram-core/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});

