import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    key: { type: String, required: true },
    icon: { type: String },
    color: { type: String },
    // Monthly budget limits, keyed by "YYYY-MM". A month with no entry
    // here has an implicit limit of 0 - this is what makes a new calendar
    // month start at 0 automatically with no reset job, while every past
    // month's value that was ever set stays exactly as it was (visible as
    // history in the Budget tab).
    limits: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

CategorySchema.index({ userId: 1, key: 1 }, { unique: true });

export default mongoose.model("Category", CategorySchema);