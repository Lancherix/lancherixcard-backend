import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import Transaction from "../models/Transaction.js";
import Recurring from "../models/Recurring.js";
import Category from "../models/Category.js";
import Goal from "../models/Goal.js";
import Settings from "../models/Settings.js";
import { parseDateString, formatDateUTC, resolveTodayParam } from "../utils/dateUtils.js";
import { serializeCategory, serializeSettings } from "../utils/serializers.js";
import { pruneOldData } from "../utils/retention.js";

const router = express.Router();

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

// One-shot fetch of everything AppContext needs to hydrate on load.
//
// ?today=YYYY-MM-DD — the client's local date. Used to decide which
// recurring items are due, which calendar month is "current" for budget
// writes, and where the 2-year retention cutoff sits. Falls back to the
// server's own UTC date if omitted or malformed, but the client should
// always send its local date (see getLocalDateString in AppContext.js).
router.get("/", requireAuth, async (req, res) => {
  try {
    const { userId } = req;
    const today = resolveTodayParam(req.query.today);

    // Retention first (drops anything from 2+ calendar years ago), then
    // post today's due recurring items — due items are always recent, so
    // ordering here doesn't matter for correctness, just tidiness.
    await pruneOldData(userId, today);
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
      categories: categories.map(serializeCategory),
      goals,
      // Full per-month history, keyed "YYYY-MM" — the frontend looks up
      // whichever month is currently being viewed, exactly like it already
      // does for income/expenses from the raw transaction list.
      budgetHistory: settings ? serializeSettings(settings).monthlyLimits : {},
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