import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    icon: { type: String },
    color: { type: String },
    target: { type: Number, required: true },
    status: {
      type: String,
      enum: ["active", "completed", "acquired"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Goal", goalSchema);
