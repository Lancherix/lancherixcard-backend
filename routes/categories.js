import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import Category from "../models/Category.js";
import { resolveTodayParam, getMonthKey } from "../utils/dateUtils.js";
import { serializeCategory } from "../utils/serializers.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const categories = await Category.find({ userId: req.userId });
  res.json(categories.map(serializeCategory));
});

router.post("/", async (req, res) => {
  try {
    const { key, icon, color, limit, today: todayParam } = req.body;
    if (!key) return res.status(400).json({ message: "missingFields" });

    const parsedLimit = Number(limit);
    if (limit === undefined || Number.isNaN(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({ message: "invalidLimit" });
    }

    const monthKey = getMonthKey(resolveTodayParam(todayParam));

    const category = await Category.create({
      userId: req.userId,
      key,
      icon,
      color,
      // A newly-created category only ever gets a limit for the month it
      // was created in - earlier months have no entry, which every reader
      // treats as an implicit 0 (it didn't exist / wasn't budgeted then).
      limits: { [monthKey]: parsedLimit },
    });
    res.status(201).json(serializeCategory(category));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "categoryAlreadyExists" });
    }
    console.error(error);
    res.status(500).json({ message: "serverError" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { key, icon, color, limit, today: todayParam } = req.body;

    const category = await Category.findOne({ _id: req.params.id, userId: req.userId });
    if (!category) return res.status(404).json({ message: "notFound" });

    if (key !== undefined) category.key = key;
    if (icon !== undefined) category.icon = icon;
    if (color !== undefined) category.color = color;

    if (limit !== undefined) {
      const parsedLimit = Number(limit);
      if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({ message: "invalidLimit" });
      }
      // Limit edits always target the CURRENT calendar month. A category's
      // limit for a past month is a historical fact the edit form doesn't
      // touch (the client only shows the edit control while viewing the
      // current month - see BudgetTab.jsx) - enforced here too so a
      // hand-crafted request can't rewrite history.
      const monthKey = getMonthKey(resolveTodayParam(todayParam));
      category.limits.set(monthKey, parsedLimit);
    }

    await category.save();
    res.json(serializeCategory(category));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "categoryAlreadyExists" });
    }
    console.error(error);
    res.status(500).json({ message: "serverError" });
  }
});

router.delete("/:id", async (req, res) => {
  const result = await Category.deleteOne({ _id: req.params.id, userId: req.userId });
  if (result.deletedCount === 0) return res.status(404).json({ message: "notFound" });
  res.status(204).end();
});

export default router;