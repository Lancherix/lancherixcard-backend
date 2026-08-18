import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import Recurring from "../models/Recurring.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const recurring = await Recurring.find({ userId: req.userId });
  res.json(recurring);
});

router.post("/", async (req, res) => {
  try {
    const { type, categoryKey, name, amount, frequency, nextDate, icon } = req.body;

    if (!type || !categoryKey || typeof amount !== "number" || !nextDate) {
      return res.status(400).json({ message: "missingFields" });
    }

    const recurring = await Recurring.create({
      userId: req.userId,
      type,
      categoryKey,
      name,
      amount,
      frequency,
      nextDate,
      icon,
    });

    res.status(201).json(recurring);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "serverError" });
  }
});

router.patch("/:id", async (req, res) => {
  const { type, categoryKey, name, amount, frequency, nextDate, icon } = req.body;
  const update = { type, categoryKey, name, amount, frequency, nextDate, icon };

  const recurring = await Recurring.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    update,
    { new: true }
  );
  if (!recurring) return res.status(404).json({ message: "notFound" });
  res.json(recurring);
});

router.delete("/:id", async (req, res) => {
  const result = await Recurring.deleteOne({ _id: req.params.id, userId: req.userId });
  if (result.deletedCount === 0) return res.status(404).json({ message: "notFound" });
  res.status(204).end();
});

export default router;