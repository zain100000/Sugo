/**
 * @file super-admin.auth.controller.js
 * @description Controller module for handling SuperAdmin authentication and profile operations.
 * Includes registration, login, logout, and fetching SuperAdmin details.
 * Utilizes bcrypt for password hashing, JWT for authentication tokens,
 * and Cloudinary for profile picture uploads.
 *
 * @module controllers/super-admin-auth
 * @requires bcrypt
 * @requires jsonwebtoken
 * @requires ../../models/super-admin-model/super-admin.model
 * @requires ../../utilities/cloudinary/cloudinary.utility
 * @requires ../../helpers/password-helper/password.helper
 * @requires ../../helpers/token-helper/token.helper
 *
 * @exports registerSuperAdmin
 * @exports loginSuperAdmin
 * @exports getSuperAdminById
 * @exports logoutSuperAdmin
 * @exports updateUserStatus
 *
 * @author
 * @version 1.0.0
 * @date 2025-10-06
 */

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const SuperAdmin = require("../../models/super-admin-model/super-admin.model");
const User = require("../../models/user-model/user.model");

const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../../utilities/cloudinary/cloudinary.utility");
const {
  passwordRegex,
  hashPassword,
} = require("../../helpers/password-helper/password.helper");
const {
  generateSecureToken,
} = require("../../helpers/token-helper/token.helper");
const {
  sendPasswordResetEmail,
} = require("../../helpers/email-helper/email.helper");

/**
 * @description Controller for SuperAdmin registration
 * @route POST /api/super-admin/signup
 * @access Public
 */
exports.registerSuperAdmin = async (req, res) => {
  let uploadedFileUrl = null;

  try {
    const { userName, email, password } = req.body;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character",
      });
    }

    const existingSuperAdmin = await SuperAdmin.findOne({
      email: email.toLowerCase(),
      role: "SUPERADMIN",
    });

    if (existingSuperAdmin) {
      return res.status(409).json({
        success: false,
        message: "SuperAdmin with this email already exists",
      });
    }

    let userProfileImageUrl = null;
    if (req.files?.profilePicture) {
      const uploadResult = await uploadToCloudinary(
        req.files.profilePicture[0],
        "profilePicture"
      );
      userProfileImageUrl = uploadResult.url;
      uploadedFileUrl = uploadResult.url;
    }

    const hashedPassword = await hashPassword(password);

    const superAdmin = new SuperAdmin({
      profilePicture: userProfileImageUrl,
      userName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "SUPERADMIN",
      isSuperAdmin: true,
      isActive: true,
      createdAt: new Date(),
      lastLogin: null,
      loginAttempts: 0,
      lockUntil: null,
    });

    await superAdmin.save();

    res.status(201).json({
      success: true,
      message: "SuperAdmin created successfully",
    });
  } catch (error) {
    if (uploadedFileUrl) {
      try {
        await deleteFromCloudinary(uploadedFileUrl);
      } catch (cloudErr) {
        console.error("Failed to rollback Cloudinary upload:", cloudErr);
      }
    }

    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(409).json({
        success: false,
        message: "SuperAdmin with this email already exists",
      });
    }

    console.error("Error creating super admin:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * @description Controller for SuperAdmin login
 * @route POST /api/super-admin/signin
 * @access Public
 */
exports.loginSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    let superadmin = await SuperAdmin.findOne({ email });

    if (!superadmin) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (superadmin.lockUntil && superadmin.lockUntil > Date.now()) {
      const remaining = Math.ceil((superadmin.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${remaining} minutes.`,
      });
    }

    if (superadmin.lockUntil && superadmin.lockUntil <= Date.now()) {
      await SuperAdmin.updateOne(
        { _id: superadmin._id },
        { $set: { loginAttempts: 0, lockUntil: null } }
      );
      superadmin.loginAttempts = 0;
      superadmin.lockUntil = null;
    }

    const isMatch = await bcrypt.compare(password, superadmin.password);

    if (!isMatch) {
      const updated = await SuperAdmin.findOneAndUpdate(
        { _id: superadmin._id },
        { $inc: { loginAttempts: 1 } },
        { new: true }
      );

      if (updated.loginAttempts >= 3) {
        const lockTime = Date.now() + 30 * 60 * 1000;
        await SuperAdmin.updateOne(
          { _id: superadmin._id },
          { $set: { lockUntil: lockTime } }
        );
        return res.status(423).json({
          success: false,
          message:
            "Too many failed login attempts. Account locked for 30 minutes.",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        attempts: updated.loginAttempts,
      });
    }

    const sessionId = generateSecureToken();
    const updatedUser = await SuperAdmin.findOneAndUpdate(
      { _id: superadmin._id },
      {
        $set: {
          loginAttempts: 0,
          lockUntil: null,
          lastLogin: new Date(),
          sessionId,
        },
      },
      { new: true }
    );

    const payload = {
      role: "SUPERADMIN",
      user: { id: updatedUser.id, email: updatedUser.email },
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { algorithm: "HS256" },
      (err, token) => {
        if (err) {
          return res
            .status(500)
            .json({ success: false, message: "Error generating token" });
        }

        res.cookie("accessToken", token, {
          httpOnly: true,
          sameSite: "strict",
          maxAge: 60 * 60 * 1000,
        });

        res.json({
          success: true,
          message: "Super Admin login successfully!",
          superAdmin: {
            id: updatedUser.id,
            userName: updatedUser.userName,
            email: updatedUser.email,
          },
          token,
          expiresIn: 3600,
        });
      }
    );
  } catch (err) {
    console.error("Login Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error logging in" });
  }
};

/**
 * @description Controller to get SuperAdmin by ID
 * @route GET /api/super-admin/get-superadmin/:superAdminId
 * @access Private (SuperAdmin)
 */
exports.getSuperAdminById = async (req, res) => {
  try {
    const { superAdminId } = req.params;

    const superAdmin = await SuperAdmin.findById(superAdminId).select(
      "-password -__v -refreshToken"
    );
    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: "Super Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Super Admin fetched successfully",
      superAdmin: superAdmin,
    });
  } catch (err) {
    console.error("getSuperAdminById Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * @description Controller for SuperAdmin logout
 * @route POST /api/super-admin/logout
 * @access Private (SuperAdmin)
 */
exports.logoutSuperAdmin = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      await SuperAdmin.findByIdAndUpdate(req.user.id, {
        $set: { sessionId: generateSecureToken() },
      });
    }

    res.clearCookie("accessToken", {
      httpOnly: true,
      sameSite: "strict",
    });

    res.status(201).json({
      success: true,
      message: "Logout Successfully!",
    });
  } catch (err) {
    console.error("Error Logging Out:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * @description Update user account status (BAN, SUSPEND, ACTIVATE) or issue a warning
 * @route PATCH /api/super-admin/user/update-user-status/:userId
 * @access Super Admin
 */

exports.updateUserStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "SUPERADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only super admin can update user status",
      });
    }

    const { userId } = req.params;
    const { action, reason, severity, expiresAt } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        message: "Action field is required (BAN, SUSPEND, ACTIVATE, WARN)",
      });
    }

    const validActions = ["BAN", "SUSPEND", "ACTIVATE", "WARN"];
    const upperAction = action.toUpperCase();

    if (!validActions.includes(upperAction)) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Valid actions are: ${validActions.join(", ")}`,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let updateData = {};
    let message = "";

    switch (upperAction) {
      case "BAN":
        updateData.accountStatus = "BANNED";
        message = "User has been banned successfully.";
        break;

      case "SUSPEND":
        updateData.accountStatus = "SUSPENDED";
        message = "User has been suspended successfully.";
        break;

      case "ACTIVATE":
        updateData.accountStatus = "ACTIVE";
        message = "User has been reactivated successfully.";
        break;

      case "WARN":
        if (!reason) {
          return res.status(400).json({
            success: false,
            message: "Reason is required when issuing a warning.",
          });
        }

        const newWarning = {
          message: `Warning issued by Super Admin`,
          reason,
          severity: severity?.toUpperCase() || "LOW",
          issuedBy: req.user?.id || null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        };

        user.warnings.push(newWarning);
        await user.save();

        return res.status(200).json({
          success: true,
          message: "Warning issued successfully.",
          user: {
            id: user._id,
            email: user.email,
            accountStatus: user.accountStatus,
            warningsCount: user.warnings.length,
            latestWarning: newWarning,
          },
        });
    }

    Object.assign(user, updateData);
    await user.save();

    res.status(200).json({
      success: true,
      message,
      user: {
        id: user._id,
        email: user.email,
        userName: user.userName,
        accountStatus: user.accountStatus,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Error updating user account status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating user account status",
    });
  }
};

/**
 * @description Controller for forgot password - Send reset link to email
 * @route POST /api/super-admin/forgot-password
 * @access Public
 */
exports.forgotPassword = async (req, res) => {
  console.log(`\n--- Forgot Password Request Initiated ---`);
  console.log("Request Body:", req.body);

  try {
    const { email } = req.body;

    if (!email) {
      console.log("🚫 Validation Error: Email is missing.");
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const superAdmin = await SuperAdmin.findOne({ email: email.toLowerCase() });

    if (!superAdmin) {
      console.log(
        `⚠️ Admin Not Found: ${email}. Returning generic success message for security.`
      );
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000;

    superAdmin.passwordResetToken = resetToken;
    superAdmin.passwordResetExpires = resetTokenExpiry;
    await superAdmin.save();

    console.log(`🔑 Token Generated for ${email}: ${resetToken}`);
    console.log(`⏲️ Token Expiry: ${new Date(resetTokenExpiry)}`);

    const emailSent = await sendPasswordResetEmail(email, resetToken);

    if (!emailSent) {
      console.error(
        "❌ Controller Error: sendPasswordResetEmail returned false. (Check emailUtils logs for details)"
      );
      return res.status(500).json({
        success: false,
        message: "Failed to send password reset email",
      });
    }

    console.log(
      `✅ Controller Success: Reset link email sent successfully for ${email}.\n`
    );
    res.status(200).json({
      success: true,
      message: "Link sent successfully! Please check your email",
    });
  } catch (error) {
    console.error(
      "❌ Fatal Error in forgot password controller:",
      error.message
    );
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @description Controller to reset password with token
 * @route POST /api/super-admin/reset-password/:token
 * @access Public
 */
exports.resetPasswordWithToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character",
      });
    }

    const superAdmin = await SuperAdmin.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!superAdmin) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    const isSameAsCurrent = await bcrypt.compare(
      newPassword,
      superAdmin.password
    );
    if (isSameAsCurrent) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as the current password",
      });
    }

    const hashedPassword = await hashPassword(newPassword);

    superAdmin.password = hashedPassword;
    superAdmin.passwordResetToken = null;
    superAdmin.passwordResetExpires = null;
    superAdmin.passwordChangedAt = new Date();
    superAdmin.sessionId = generateSecureToken();

    await superAdmin.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @description Controller to verify reset token validity
 * @route GET /api/super-admin/verify-reset-token/:token
 * @access Public
 */
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    const superAdmin = await SuperAdmin.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!superAdmin) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    res.status(200).json({
      success: true,
      message: "Valid reset token",
    });
  } catch (error) {
    console.error("Error verifying reset token:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
