import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const transactions = await Transaction.find({ userId: req.userId }).sort({ date: -1 });
  res.json(transactions);
});

router.post("/", async (req, res) => {
  try {
    const { type, categoryKey, name, date, amount, note, goalId, icon } = req.body;

    if (!type || !categoryKey || !date || typeof amount !== "number") {
      return res.status(400).json({ message: "missingFields" });
    }

    const tx = await Transaction.create({
      userId: req.userId,
      type,
      categoryKey,
      name: name ?? categoryKey,
      date,
      amount,
      note,
      goalId,
      icon,
    });

    res.status(201).json(tx);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "serverError" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const tx = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!tx) return res.status(404).json({ message: "notFound" });
    res.json(tx);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "serverError" });
  }
});

router.delete("/:id", async (req, res) => {
  const result = await Transaction.deleteOne({ _id: req.params.id, userId: req.userId });
  if (result.deletedCount === 0) return res.status(404).json({ message: "notFound" });
  res.status(204).end();
});

export default router;
