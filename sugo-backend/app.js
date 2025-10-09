const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const { securityMiddleware } = require("./middlewares/security.middleware");

const app = express();

// ============================================================
// 🔹 Startup Logging
// ============================================================
console.log("🚀 Starting SUGO Backend...");
console.log("📋 Environment Check:");
console.log("   - NODE_ENV:", process.env.NODE_ENV);
console.log("   - PORT:", process.env.PORT);
console.log("   - MONGODB_URI:", process.env.MONGODB_URI ? "Set" : "NOT SET");
console.log("   - VERCEL:", process.env.VERCEL ? "Yes" : "No");

// ============================================================
// 🔹 Core Middlewares
// ============================================================
securityMiddleware(app);
app.use(cookieParser());
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : "*",
  credentials: true,
  optionsSuccessStatus: 201,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : "*";
  const origin = req.headers.origin;

  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Content-Type-Options"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS, PUT"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// ============================================================
// 🔹 DATABASE CONNECTION (Serverless Optimized)
// ============================================================
const connectDB = async () => {
  // Check if MongoDB URI is set
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI environment variable is not set");
    return false;
  }

  // If already connected, return the connection
  if (mongoose.connection.readyState === 1) {
    console.log("✅ Using existing MongoDB connection");
    return true;
  }

  try {
    console.log("🧩 Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Reduced for serverless
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2, // Added for serverless
      retryWrites: true,
      w: "majority",
    });

    console.log("✅ Connected to MongoDB successfully!");
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    return false;
  }
};

// Global variable to cache DB connection
let isDBConnected = false;

// ============================================================
// 🔹 API ROUTES
// ============================================================
const superAdminRoute = require("./routes/super-admin-route/super-admin.route.js");
app.use("/api/super-admin", superAdminRoute);

// ============================================================
// 🔹 HEALTH CHECKS
// ============================================================
app.get("/api/health", async (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";

  res.status(200).json({
    success: true,
    message: "Server is healthy 🩺",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: dbStatus,
    platform: "Vercel Serverless",
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SUGO Backend running successfully 🚀",
    environment: process.env.NODE_ENV,
    platform: "Vercel",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// 🔹 DB CONNECTION MIDDLEWARE
// ============================================================
app.use(async (req, res, next) => {
  // Skip DB connection for health checks
  if (req.path === "/api/health" || req.path === "/") {
    return next();
  }

  try {
    if (!isDBConnected) {
      isDBConnected = await connectDB();
    }

    if (!isDBConnected && mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: "Database connection unavailable",
        error: "Service temporarily unavailable",
      });
    }

    next();
  } catch (error) {
    console.error("Database connection middleware error:", error);
    res.status(503).json({
      success: false,
      message: "Database connection error",
      error: process.env.NODE_ENV === "production" ? {} : error.message,
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.path,
  });
});

// ============================================================
// 🔹 ERROR HANDLING MIDDLEWARE
// ============================================================
app.use((error, req, res, next) => {
  console.error("💥 Unhandled Error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "production" ? {} : error.message,
  });
});

// ============================================================
// 🔹 Vercel Export
// ============================================================

connectDB(); // connect once at startup for serverless function reuse
module.exports = app;

// ============================================================
// 🔹 UNCAUGHT EXCEPTION HANDLERS
// ============================================================
process.on("uncaughtException", (error) => {
  console.error("💥 UNCAUGHT EXCEPTION:", error);
  if (require.main === module) {
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 UNHANDLED REJECTION at:", promise, "reason:", reason);
  if (require.main === module) {
    process.exit(1);
  }
});

module.exports = app;
