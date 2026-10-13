// Load .env.test the same way Next.js does (Vitest sets NODE_ENV=test).
// Default import: the named import does not work in ESM.
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
