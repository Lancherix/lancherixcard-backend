import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    // Stable, untranslated key — display text comes from the frontend's
    // i18n layer via tCategory(key), never stored here.
    key: { type: String, required: true },
    icon: { type: String },
    color: { type: String },
    limit: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

categorySchema.index({ userId: 1, key: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);