import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests live in tests/unit, integration tests in tests/integration.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" throws outside Next.js, so tests get an empty module.
      "server-only": fileURLToPath(new URL("./tests/helpers/empty-module.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/helpers/load-env.ts"],
    hookTimeout: 30000,
  },
});
