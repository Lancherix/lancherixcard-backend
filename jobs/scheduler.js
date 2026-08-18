import cron from "node-cron";
import { processRecurring } from "./processRecurring.js";
import { cleanupOldTransactions } from "./cleanupOldTransactions.js";

export function startScheduler() {
  // Every day at 00:05 — generates any due recurring transactions.
  cron.schedule("5 0 * * *", async () => {
    try {
      await processRecurring();
    } catch (error) {
      console.error("processRecurring job failed:", error);
    }
  });

  // Feb 1st at 00:10 — drops the previous year's transactions.
  cron.schedule("10 0 1 2 *", async () => {
    try {
      await cleanupOldTransactions();
    } catch (error) {
      console.error("cleanupOldTransactions job failed:", error);
    }
  });

  console.log("Scheduler started: processRecurring (daily), cleanupOldTransactions (Feb 1)");
}
