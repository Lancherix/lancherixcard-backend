import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import Goal from "../models/Goal.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const goals = await Goal.find({ userId: req.userId });
  res.json(goals);
});

router.post("/", async (req, res) => {
  try {
    const { name, icon, color, target, status } = req.body;
    if (!name || typeof target !== "number") {
      return res.status(400).json({ message: "missingFields" });
    }

    const goal = await Goal.create({ userId: req.userId, name, icon, color, target, status });
    res.status(201).json(goal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "serverError" });
  }
});

router.patch("/:id", async (req, res) => {
  const goal = await Goal.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  );
  if (!goal) return res.status(404).json({ message: "notFound" });
  res.json(goal);
});

router.delete("/:id", async (req, res) => {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!goal) return res.status(404).json({ message: "notFound" });
  // A goal's transactions (contributions/withdrawals) go with it — mirrors
  // DELETE_GOAL in the frontend reducer, which filters t.goalId === id.
  await Transaction.deleteMany({ userId: req.userId, goalId: goal._id });
  res.status(204).end();
});

// A contribution IS a transaction (categoryKey "savings", tagged with
// goalId) — mirrors CONTRIBUTE_TO_GOAL. savingsLabel/goalLabel let the
// client pass already-translated text since the server has no i18n.
router.post("/:id/contribute", async (req, res) => {
  const { amount, date, note, savingsLabel, goalLabel } = req.body;
  if (typeof amount !== "number" || amount <= 0 || !date) {
    return res.status(400).json({ message: "missingFields" });
  }

  const goal = await Goal.findOne({ _id: req.params.id, userId: req.userId });
  if (!goal) return res.status(404).json({ message: "notFound" });

  const tx = await Transaction.create({
    userId: req.userId,
    type: "expense",
    categoryKey: "savings",
    name: `${savingsLabel ?? "Savings"}: ${goal.name ?? goalLabel ?? "Goal"}`,
    date,
    amount,
    note,
    goalId: goal._id,
    icon: goal.icon ?? "savings",
  });

  res.status(201).json(tx);
});

router.post("/:id/withdraw", async (req, res) => {
  const { amount, date, note, withdrawalLabel, goalLabel } = req.body;
  if (typeof amount !== "number" || amount <= 0 || !date) {
    return res.status(400).json({ message: "missingFields" });
  }

  const goal = await Goal.findOne({ _id: req.params.id, userId: req.userId });
  if (!goal) return res.status(404).json({ message: "notFound" });

  const tx = await Transaction.create({
    userId: req.userId,
    type: "income",
    categoryKey: "savings",
    name: `${withdrawalLabel ?? "Withdrawal"}: ${goal.name ?? goalLabel ?? "Goal"}`,
    date,
    amount,
    note,
    goalId: goal._id,
    icon: goal.icon ?? "savings",
  });

  res.status(201).json(tx);
});

export default router;
