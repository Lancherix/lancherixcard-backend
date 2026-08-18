import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    monthlyLimit: { type: Number, default: 0 },
    // null until the user completes currency onboarding — mirrors the
    // frontend's `currency: null` meaning "still onboarding".
    currencyCode: { type: String, default: null },
    exchangeRate: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export default mongoose.model("Settings", settingsSchema);