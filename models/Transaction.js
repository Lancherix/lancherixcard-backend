import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    categoryKey: { type: String, required: true },
    name: { type: String },
    // Kept as "YYYY-MM-DD" string to match the frontend's toLocalDateString
    // convention exactly — avoids timezone drift between client and server.
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    note: { type: String },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: "Goal" },
    recurringId: { type: mongoose.Schema.Types.ObjectId, ref: "Recurring" },
    icon: { type: String },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1 });

export default mongoose.model("Transaction", transactionSchema);
