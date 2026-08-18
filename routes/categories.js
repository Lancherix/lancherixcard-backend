import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import Category from "../models/Category.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const categories = await Category.find({ userId: req.userId });
  res.json(categories);
});

router.post("/", async (req, res) => {
  try {
    const { key, icon, color, limit } = req.body;
    if (!key) return res.status(400).json({ message: "missingFields" });

    const parsedLimit = Number(limit);
    if (limit === undefined || Number.isNaN(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({ message: "invalidLimit" });
    }

    const category = await Category.create({
      userId: req.userId,
      key,
      icon,
      color,
      limit: parsedLimit,
    });
    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "categoryAlreadyExists" });
    }
    console.error(error);
    res.status(500).json({ message: "serverError" });
  }
});

router.patch("/:id", async (req, res) => {
  const { key, icon, color, limit } = req.body;
  const update = { key, icon, color };

  if (limit !== undefined) {
    const parsedLimit = Number(limit);
    if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({ message: "invalidLimit" });
    }
    update.limit = parsedLimit;
  }

  const category = await Category.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    update,
    { new: true }
  );
  if (!category) return res.status(404).json({ message: "notFound" });
  res.json(category);
});

router.delete("/:id", async (req, res) => {
  const result = await Category.deleteOne({ _id: req.params.id, userId: req.userId });
  if (result.deletedCount === 0) return res.status(404).json({ message: "notFound" });
  res.status(204).end();
});

export default router;