import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import { startScheduler } from "./jobs/scheduler.js";

import meRoutes from "./routes/me.js";
import stateRoutes from "./routes/state.js";
import transactionsRoutes from "./routes/transactions.js";
import recurringRoutes from "./routes/recurring.js";
import categoriesRoutes from "./routes/categories.js";
import goalsRoutes from "./routes/goals.js";
import settingsRoutes from "./routes/settings.js";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : true }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/me", meRoutes);
app.use("/state", stateRoutes);
app.use("/transactions", transactionsRoutes);
app.use("/recurring", recurringRoutes);
app.use("/categories", categoriesRoutes);
app.use("/goals", goalsRoutes);
app.use("/settings", settingsRoutes);

async function start() {
  await connectDB();

  if (process.env.ENABLE_SCHEDULER !== "false") {
    startScheduler();
  }

  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`lancherixcard-backend listening on port ${port}`));
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
