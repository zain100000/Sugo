/**
 * SuperAdmin Schema
 * @typedef {Object} SuperAdmin
 * @property {string|null} [profilePicture] - URL or path to the super admin's profile picture
 * @property {string} userName - Unique username for the super admin (trimmed)
 * @property {string} email - Unique email address for the super admin (lowercase, trimmed)
 * @property {string} password - Hashed password for authentication
 * @property {string} [role="SUPERADMIN"] - Role designation (always "SUPERADMIN")
 * @property {boolean} [isSuperAdmin=true] - Flag indicating super admin status
 * @property {boolean} [isActive=true] - Account active status
 * @property {Date} [createdAt] - Date when the account was created
 * @property {Date|null} [lastLogin] - Timestamp of the last successful login
 * @property {number} [loginAttempts=0] - Number of consecutive failed login attempts
 * @property {Date|null} [lockUntil] - Timestamp until which the account is locked due to excessive failed attempts
 * @property {string|null} [sessionId] - Current active session identifier
 * @property {string|null} [passwordResetToken] - Token for password reset functionality
 * @property {Date|null} [passwordResetExpires] - Expiration date for the password reset token
 * @property {Date} createdAt - Auto-generated creation timestamp
 * @property {Date} updatedAt - Auto-generated update timestamp
 */

const mongoose = require("mongoose");

const superAdminSchema = new mongoose.Schema(
  {
    profilePicture: {
      type: String,
      default: null,
    },

    userName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["SUPERADMIN"],
      default: "SUPERADMIN",
    },

    isSuperAdmin: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    sessionId: {
      type: String,
      default: null,
    },

    passwordResetToken: {
      type: String,
      default: null,
    },

    passwordResetExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SuperAdmin", superAdminSchema);
