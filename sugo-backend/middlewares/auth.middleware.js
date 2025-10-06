const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const SuperAdmin = require("../models/super-admin-model/super-admin.model");
const User = require("../models/user-model/user.model");
const { rateLimit } = require("express-rate-limit");

/**
 * @constant ENV_VARIABLES
 * @description Environment variables configuration for the Libris Vault backend.
 * @note Ensure that JWT_SECRET is set in your environment for security.
 */
if (!process.env.JWT_SECRET) {
  const generatedSecret = crypto.randomBytes(64).toString("hex");
  process.env.JWT_SECRET = generatedSecret;
}

/**
 * @constant authLimiter
 * @description Middleware that prevents brute-force attacks by limiting authentication attempts.
 * Restricts users to 3 failed login attempts per 15 minutes.
 */
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @function authenticateAndAuthorize
 * @description Enhanced middleware that authenticates and authorizes users with additional security measures.
 */
exports.authMiddleware = async (req, res, next) => {
  try {
    let jwtToken = null;
    const authHeader = req.header("Authorization");

    if (authHeader?.startsWith("Bearer ")) {
      jwtToken = authHeader.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      jwtToken = req.cookies.accessToken;
    }

    if (!jwtToken) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized Access, Token is missing",
      });
    }

    const decodedToken = jwt.verify(jwtToken, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      clockTolerance: 30,
    });

    if (
      !decodedToken?.user?.id ||
      !decodedToken?.role ||
      !decodedToken?.iat ||
      !decodedToken?.exp
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid Token Structure",
      });
    }

    if (decodedToken.exp < Date.now() / 1000) {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
      });
    }

    const maxTokenAge = 24 * 60 * 60;
    if (decodedToken.iat < Date.now() / 1000 - maxTokenAge) {
      return res.status(401).json({
        success: false,
        message: "Token is too old",
      });
    }

    let userModel;
    switch (decodedToken.role) {
      case "SUPERADMIN":
        userModel = SuperAdmin;
        break;

      case "USER":
        userModel = User;
        break;

      default:
        return res.status(401).json({
          success: false,
          message: "Invalid user role",
        });
    }

    const user = await userModel
      .findById(decodedToken.user.id)
      .select("-password -refreshToken -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User Not Found",
      });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    req.user = {
      id: user._id.toString(),
      role: decodedToken.role,
      email: user.email,
      sessionId: decodedToken.sessionId || null,
    };

    req.userId = user._id.toString();

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    console.error("Authentication Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};
