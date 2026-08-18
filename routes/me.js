import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

// Lightweight compared to Auth's own /me (which populates full user +
// projects) — this app doesn't own user profile data, it only needs to
// confirm the token is valid and hand back the id ProtectedRoute checks for.
router.get("/", requireAuth, (req, res) => {
  res.json({ userId: req.userId });
});

export default router;
