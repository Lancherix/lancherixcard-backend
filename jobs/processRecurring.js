import Recurring from "../models/Recurring.js";
import Transaction from "../models/Transaction.js";

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function advanceDate(dateStr, frequency) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  switch (frequency) {
    case "Weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "Biweekly":
      date.setDate(date.getDate() + 14);
      break;
    case "Monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "Yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  return toLocalDateString(date);
}

// Runs across ALL users — direct port of the PROCESS_RECURRING reducer case,
// just operating on the DB instead of in-memory state. For each recurring
// item that's overdue, inserts one transaction per elapsed cycle and
// advances nextDate past today.
export async function processRecurring() {
  const todayStr = toLocalDateString(new Date());
  const dueItems = await Recurring.find({ nextDate: { $lte: todayStr } });

  for (const r of dueItems) {
    let nextDate = r.nextDate;
    const newTransactions = [];

    while (nextDate <= todayStr) {
      newTransactions.push({
        userId: r.userId,
        type: r.type,
        categoryKey: r.categoryKey,
        name: r.name,
        date: nextDate,
        amount: r.amount,
        icon: r.icon,
        recurringId: r._id,
      });
      nextDate = advanceDate(nextDate, r.frequency);
    }

    if (newTransactions.length > 0) {
      await Transaction.insertMany(newTransactions);
      await Recurring.updateOne({ _id: r._id }, { nextDate });
    }
  }

  if (dueItems.length > 0) {
    console.log(`processRecurring: generated transactions for ${dueItems.length} recurring item(s)`);
  }
}
