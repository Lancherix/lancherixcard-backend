import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    currencyCode: { type: String },
    exchangeRate: { type: Number, default: 1 },
    // Overall monthly budget limits, keyed by "YYYY-MM" - same convention
    // as Category.limits above (no entry = 0).
    monthlyLimits: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.model("Settings", SettingsSchema);