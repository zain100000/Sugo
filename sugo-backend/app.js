const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const http = require("http");
require("dotenv").config();

const { securityMiddleware } = require("./middlewares/security.middleware");

const app = express();

// ============================================================
// 🔹 Core Middlewares
// ============================================================
securityMiddleware(app);
app.use(cookieParser());
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));

const corsOptions = {
  origin:
    process.env.ALLOWED_ORIGINS === "*"
      ? true
      : process.env.ALLOWED_ORIGINS.split(","),
  credentials: true,
  optionsSuccessStatus: 201,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.ALLOWED_ORIGINS || "*"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Content-Type-Options"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// ============================================================
// 🔹 API ROUTES
// ============================================================
const superAdminRoute = require("./routes/super-admin-route/super-admin.route.js");

app.use("/api/super-admin", superAdminRoute);

// ============================================================
// 🔹 HEALTH CHECKS
// ============================================================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy 🩺",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend running successfully 🚀",
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API endpoint not found" });
});

// ============================================================
// 🔹 MONGODB CONNECTION + SERVER START
// ============================================================
const startServer = async () => {
  try {
    console.log("🧩 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ Connected to MongoDB successfully!");

    // FIX: Change from 8080 to 8000
    const PORT = process.env.PORT || 8000; // ← CHANGED THIS LINE
    const server = app.listen(PORT, "0.0.0.0", () => {
      // ← ADDED '0.0.0.0'
      console.log(`🚀 Server is running on port ${PORT}`);
    });

    return server; // ← ADDED THIS
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

// FIX: Store the server instance
const server = startServer();

// ============================================================
// 🔹 GRACEFUL SHUTDOWN HANDLERS
// ============================================================
const shutdown = (signal) => {
  console.log(`⚙️  ${signal} received. Shutting down gracefully...`);
  mongoose.connection.close(() => {
    console.log("🧹 MongoDB connection closed.");
    if (server) {
      server.close(() => {
        console.log("🧤 HTTP server closed. Goodbye 👋");
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = app;
