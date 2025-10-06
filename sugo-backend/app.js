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

// ============================================================
// 🔹 Core Middlewares
// ============================================================
securityMiddleware(app);
app.use(cookieParser());
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS || "*",
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
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
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
// 🔹 MONGODB CONNECTION + SERVER START
// ============================================================
const startServer = async () => {
  try {
    // Check if MongoDB URI is set
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    console.log("🧩 Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: "majority",
    });

    console.log("✅ Connected to MongoDB successfully!");

    const PORT = process.env.PORT || 8000;
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(
        `🏥 Health check available at: http://0.0.0.0:${PORT}/api/health`
      );
    });

    return server;
  } catch (error) {
    console.error("❌ FATAL: Failed to start server:", error);
    console.error("💡 Check your MONGODB_URI environment variable");
    process.exit(1);
  }
};

// ============================================================
// 🔹 START THE SERVER
// ============================================================
let server;
startServer()
  .then((s) => {
    server = s;
  })
  .catch((error) => {
    console.error("💥 Failed to start server:", error);
    process.exit(1);
  });

// ============================================================
// 🔹 GRACEFUL SHUTDOWN HANDLERS
// ============================================================
const shutdown = (signal) => {
  console.log(`⚙️  ${signal} received. Shutting down gracefully...`);
  if (mongoose.connection.readyState === 1) {
    mongoose.connection.close(false, () => {
      console.log("🧹 MongoDB connection closed.");
    });
  }
  if (server) {
    server.close(() => {
      console.log("🧤 HTTP server closed. Goodbye 👋");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ============================================================
// 🔹 UNCAUGHT EXCEPTION HANDLERS
// ============================================================
process.on("uncaughtException", (error) => {
  console.error("💥 UNCAUGHT EXCEPTION:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 UNHANDLED REJECTION at:", promise, "reason:", reason);
  process.exit(1);
});

module.exports = app;
