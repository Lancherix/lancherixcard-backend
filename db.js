import mongoose from "mongoose";

export async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set — check your .env file");
  }

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB (lancherixcard)");
}
