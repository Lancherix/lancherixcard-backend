import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import Settings from "../models/Settings.js";
import Transaction from "../models/Transaction.js";
import Recurring from "../models/Recurring.js";
import Goal from "../models/Goal.js";
import Category from "../models/Category.js";

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
  res.json(settings);
});

router.patch("/budget", async (req, res) => {
  const { monthlyLimit } = req.body;
  if (typeof monthlyLimit !== "number" || monthlyLimit < 0) {
    return res.status(400).json({ message: "invalidAmount" });
  }
  const settings = await Settings.findOneAndUpdate(
    { userId: req.userId },
    { monthlyLimit },
    { new: true, upsert: true }
  );
  res.json(settings);
});

// First-time currency pick — no conversion, nothing to rescale yet.
// Mirrors SET_CURRENCY.
router.post("/currency", async (req, res) => {
  const { code, exchangeRate } = req.body;
  if (!code) return res.status(400).json({ message: "missingCode" });

  const settings = await Settings.findOneAndUpdate(
    { userId: req.userId },
    { currencyCode: code, exchangeRate: exchangeRate ?? 1 },
    { new: true, upsert: true }
  );
  res.json(settings);
});

// Existing user switching currency later — rescales every stored amount by
// `rate` (units of new currency per 1 unit of current currency), so the
// user sees amounts of the right real-world size, not just relabeled
// numbers. Mirrors CHANGE_CURRENCY.
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
      ...categories.map((c) =>
        Category.updateOne({ _id: c._id }, { limit: round2(c.limit * r) })
      ),
      Settings.updateOne(
        { userId },
        {
          currencyCode: code,
          exchangeRate: r,
          monthlyLimit: round2(settings.monthlyLimit * r),
        }
      ),
    ]);

    const updated = await Settings.findOne({ userId });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "serverError" });
  }
});

export default router;