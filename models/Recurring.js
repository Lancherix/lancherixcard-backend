import mongoose from "mongoose";

const recurringSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    categoryKey: { type: String, required: true },
    name: { type: String },
    amount: { type: Number, required: true },
    frequency: {
      type: String,
      enum: ["Weekly", "Biweekly", "Monthly", "Yearly"],
      default: "Monthly",
    },
    nextDate: { type: String, required: true }, // "YYYY-MM-DD"
    icon: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Recurring", recurringSchema);