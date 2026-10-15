import { execSync } from "node:child_process";
import net from "node:net";

async function waitForPort(
  port: number,
  host: string = "localhost",
  timeoutMs: number = 30000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const isUp = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("error", () => {
        socket.destroy();
        resolve(false);
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, host);
    });

    if (isUp) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  console.log("=== BenchBook Local Setup ===\n");

  console.log("1. Starting PostgreSQL database with Docker Compose...");
  try {
    execSync("docker compose up -d db", { stdio: "inherit" });
  } catch {
    console.warn(
      "Notice: docker compose command failed or Docker is not running. Checking if PostgreSQL is already accessible on port 5432...",
    );
  }

  console.log("\n2. Waiting for database to be ready on port 5432...");
  const isReady = await waitForPort(5432, "localhost", 30000);
  if (!isReady) {
    console.error(
      "Error: PostgreSQL is not reachable on port 5432 after 30 seconds. Please ensure Docker Desktop is running.",
    );
    process.exit(1);
  }
  console.log("PostgreSQL is healthy and accepting connections.\n");

  console.log("3. Deploying Prisma database migrations...");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });

  console.log("\n4. Running database seed...");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });

  console.log("\n=== Setup completed successfully! ===");
  console.log("Run `npm run dev` to start the development server at http://localhost:3000\n");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
