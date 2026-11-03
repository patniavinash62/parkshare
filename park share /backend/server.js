
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import parkingRoutes from "./routes/parkingRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("Set a secure JWT_SECRET of at least 32 characters.");
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is missing.");
  process.exit(1);
}

// SECURITY
app.use(helmet());

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5501"
  ]
}));

app.use(express.json({ limit: "20kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later."
  }
});

// HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "ParkShare Backend Running"
  });
});

// ROUTES
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/parking", parkingRoutes);
app.use("/api/bookings", bookingRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    message: "API route not found"
  });
});

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(500).json({
    message: "Internal server error"
  });
});

// START SERVER AFTER DATABASE CONNECTION
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`ParkShare Server Running: http://localhost:${PORT}`);
  });
});
