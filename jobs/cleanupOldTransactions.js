import Transaction from "../models/Transaction.js";

// Port of removePreviousYearTransactions. Previously this only ran because
// the frontend happened to be open on Feb 1st — now it's a real scheduled
// job (see scheduler.js), so it runs regardless of whether anyone has the
// app open that day.
export async function cleanupOldTransactions() {
  const today = new Date();
  const previousYear = today.getFullYear() - 1;
  const prefix = `${previousYear}-`;

  const result = await Transaction.deleteMany({
    date: { $regex: `^${prefix}` },
  });

  console.log(`cleanupOldTransactions: removed ${result.deletedCount} transaction(s) from ${previousYear}`);
}
