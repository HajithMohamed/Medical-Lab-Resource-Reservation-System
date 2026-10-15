import { runDailyJob } from "../src/services/daily-job";

async function main() {
  console.log("[daily] Running daily synchronization job...");
  const result = await runDailyJob();
  console.log("[daily] Completed:", result);
}

main().catch((err) => {
  console.error("[daily] Failed:", err);
  process.exit(1);
});
