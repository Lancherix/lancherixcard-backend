import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import Transaction from "../models/Transaction.js";
import Recurring from "../models/Recurring.js";
import Category from "../models/Category.js";
import Goal from "../models/Goal.js";
import Settings from "../models/Settings.js";

const router = express.Router();

// Parses a "YYYY-MM-DD" string as a UTC date, and formats a Date back to
// "YYYY-MM-DD" using UTC getters. Using UTC consistently on both ends here
// (rather than the server's local getters) means the arithmetic below is
// never affected by the server's own time zone — it only ever moves in
// whole calendar days/months/years relative to the string it was given.
function parseDateString(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateUTC(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function advanceDate(dateStr, frequency) {
  const d = parseDateString(dateStr);
  switch (frequency) {
    case "Weekly":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "Biweekly":
      d.setUTCDate(d.getUTCDate() + 14);
      break;
    case "Yearly":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
    case "Monthly":
    default:
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
  }
  return formatDateUTC(d);
}

// Posts any recurring item whose nextDate has arrived (<= today) as a real
// Transaction, then advances nextDate to the next occurrence — looping in
// case the user hasn't opened the app in a while and multiple occurrences
// are due. Once posted, that occurrence is a normal Transaction the user
// can edit or delete independently; editing/deleting the Recurring item
// itself only affects occurrences that haven't posted yet.
async function postDueRecurring(userId, today) {
  const dueItems = await Recurring.find({ userId, nextDate: { $lte: today } });
  if (dueItems.length === 0) return;

  for (const item of dueItems) {
    let nextDate = item.nextDate;
    while (nextDate <= today) {
      await Transaction.create({
        userId,
        type: item.type,
        categoryKey: item.categoryKey,
        name: item.name,
        date: nextDate,
        amount: item.amount,
        recurringId: item._id,
        icon: item.icon,
      });
      nextDate = advanceDate(nextDate, item.frequency);
    }
    await Recurring.updateOne({ _id: item._id }, { nextDate });
  }
}

// One-shot fetch of everything AppContext needs to hydrate on load, instead
// of five separate round trips. Shape mirrors the frontend's initialState
// in AppContext.jsx so it can replace it directly.
//
// ?today=YYYY-MM-DD — the client's local date, used to decide which
// recurring items are due. Falls back to the server's own UTC date if
// omitted or malformed, but the client should always send its local date
// (see getLocalDateString in AppContext.js) so "due" matches what the user
// actually sees on their calendar, not the server's.
router.get("/", requireAuth, async (req, res) => {
  try {
    const { userId } = req;

    const todayParam = req.query.today;
    const today = /^\d{4}-\d{2}-\d{2}$/.test(todayParam)
      ? todayParam
      : formatDateUTC(new Date());

    await postDueRecurring(userId, today);

    const [transactions, recurring, categories, goals, settings] = await Promise.all([
      Transaction.find({ userId }).sort({ date: -1 }),
      Recurring.find({ userId }),
      Category.find({ userId }),
      Goal.find({ userId }),
      Settings.findOne({ userId }),
    ]);

    res.json({
      transactions,
      recurring,
      categories,
      goals,
      budget: { monthlyLimit: settings?.monthlyLimit ?? 0 },
      currency: settings?.currencyCode
        ? { code: settings.currencyCode, exchangeRate: settings.exchangeRate }
        : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "serverError" });
  }
});

export default router;