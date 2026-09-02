import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import Settings from "../models/Settings.js";
import Transaction from "../models/Transaction.js";
import Recurring from "../models/Recurring.js";
import Goal from "../models/Goal.js";
import Category from "../models/Category.js";
import { resolveTodayParam, getMonthKey } from "../utils/dateUtils.js";
import { serializeSettings } from "../utils/serializers.js";

const router = express.Router();
router.use(requireAuth);

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function getOrCreateSettings(userId) {
  let settings = await Settings.findOne({ userId });
  if (!settings) settings = await Settings.create({ userId });
  return settings;
}

router.get("/", async (req, res) => {
  const settings = await getOrCreateSettings(req.userId);
  res.json(serializeSettings(settings));
});

router.patch("/budget", async (req, res) => {
  const { monthlyLimit, today: todayParam } = req.body;
  if (typeof monthlyLimit !== "number" || monthlyLimit < 0) {
    return res.status(400).json({ message: "invalidAmount" });
  }

  // Same rule as category limits: this writes only the CURRENT month's
  // entry. Whatever was set for past months stays untouched - that's what
  // makes them show up as history afterward.
  const monthKey = getMonthKey(resolveTodayParam(todayParam));

  const settings = await getOrCreateSettings(req.userId);
  settings.monthlyLimits.set(monthKey, monthlyLimit);
  await settings.save();
  res.json(serializeSettings(settings));
});

// First-time currency pick — no conversion, nothing to rescale yet.
router.post("/currency", async (req, res) => {
  const { code, exchangeRate } = req.body;
  if (!code) return res.status(400).json({ message: "missingCode" });

  const settings = await getOrCreateSettings(req.userId);
  settings.currencyCode = code;
  settings.exchangeRate = exchangeRate ?? 1;
  await settings.save();
  res.json(serializeSettings(settings));
});

// Existing user switching currency later — rescales every stored amount by
// `rate`, including EVERY month's entry in every budget-history map, not
// just the current one, so past months stay comparable in the new currency
// instead of silently drifting out of scale.
router.post("/currency/change", async (req, res) => {
  try {
    const { code, rate } = req.body;
    const r = Number(rate) > 0 ? Number(rate) : 1;
    if (!code) return res.status(400).json({ message: "missingCode" });

    const { userId } = req;

    const [transactions, recurring, goals, categories, settings] = await Promise.all([
      Transaction.find({ userId }),
      Recurring.find({ userId }),
      Goal.find({ userId }),
      Category.find({ userId }),
      getOrCreateSettings(userId),
    ]);

    const rescaleMap = (map) => {
      for (const [key, value] of map.entries()) {
        map.set(key, round2(value * r));
      }
    };

    rescaleMap(settings.monthlyLimits);
    settings.currencyCode = code;
    settings.exchangeRate = r;
    categories.forEach((c) => rescaleMap(c.limits));

    await Promise.all([
      ...transactions.map((t) =>
        Transaction.updateOne({ _id: t._id }, { amount: round2(t.amount * r) })
      ),
      ...recurring.map((rec) =>
        Recurring.updateOne({ _id: rec._id }, { amount: round2(rec.amount * r) })
      ),
      ...goals.map((g) =>
        Goal.updateOne({ _id: g._id }, { target: round2(g.target * r) })
      ),
      ...categories.map((c) => c.save()),
      settings.save(),
    ]);

    const updated = await Settings.findOne({ userId });
    res.json(serializeSettings(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "serverError" });
  }
});

export default router;