import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();
const AUTH_API_URL="https://lancherixstudio-backend.onrender.com";

router.get("/", requireAuth, async (req, res) => {
  try {
    const response = await fetch(
      `${AUTH_API_URL}/auth/me`,
      {
        headers: {
          Authorization: req.headers.authorization,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error("Failed to fetch user profile:", error);

    res.status(500).json({
      message: "profileFetchFailed",
    });
  }
});

export default router;