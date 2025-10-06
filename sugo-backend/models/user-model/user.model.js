/**
 * User Schema
 * @typedef {Object} User
 * @property {string|null} [profilePicture] - URL or path to the user's profile picture
 * @property {string} userName - Unique username for the user (trimmed)
 * @property {string} email - Unique email address for the user (lowercase)
 * @property {string} password - Hashed password for authentication (min length: 6)
 * @property {string|null} [phone] - Unique phone number for the user
 * @property {string} [bio] - User biography (max length: 200 characters)
 * @property {string} [gender] - User gender (enum: "MALE", "FEMALE", "OTHER")
 * @property {Date} [dob] - User date of birth
 * @property {string} [displayName] - User's display name for chat rooms
 * @property {string} [status="ONLINE"] - User online status (enum: "ONLINE", "OFFLINE", "AWAY", "BUSY")
 * @property {string} [role="USER"] - User role (enum: "USER", "MODERATOR", "ADMIN", "SUPER-ADMIN")
 * @property {boolean} [isVerified=false] - Email verification status
 * @property {boolean} [isPhoneVerified=false] - Phone verification status
 * @property {string} [accountStatus="ACTIVE"] - Account status (enum: "ACTIVE", "SUSPENDED", "BANNED")
 * @property {Date|null} [lastLogin] - Timestamp of the last successful login
 * @property {number} [loginAttempts=0] - Number of consecutive failed login attempts
 * @property {Date|null} [lockUntil] - Timestamp until which the account is locked
 * @property {string|null} [sessionId] - Current active session identifier
 * @property {Array.<Object>} [warnings] - Array of warning messages with timestamps
 * @property {Array.<mongoose.Types.ObjectId>} [followers] - Array of user IDs who follow this user
 * @property {Array.<mongoose.Types.ObjectId>} [following] - Array of user IDs this user follows
 * @property {Array.<mongoose.Types.ObjectId>} [blockedUsers] - Array of user IDs this user has blocked
 * @property {Array.<mongoose.Types.ObjectId>} [mutedUsers] - Array of user IDs this user has muted
 * @property {number} [coins=0] - Virtual currency balance
 * @property {Object} [wallet] - User wallet information
 * @property {number} [wallet.balance=0] - Current wallet balance
 * @property {string} [wallet.currency="USD"] - Currency type
 * @property {Array.<Object>} [transactionHistory] - History of all transactions
 * @property {string|null} [passwordResetToken] - Token for password reset
 * @property {Date|null} [passwordResetExpires] - Expiration for password reset token
 * @property {Object} [phoneVerification] - Phone verification details
 * @property {string|null} [phoneVerification.otp] - OTP for phone verification
 * @property {Date|null} [phoneVerification.expiresAt] - OTP expiration date
 * @property {number} [phoneVerification.attempts=0] - OTP verification attempts
 * @property {Array.<Object>} [media] - Array of user media content
 * @property {Object} [preferences] - User preferences and settings
 * @property {boolean} [preferences.emailNotifications=true] - Email notifications preference
 * @property {boolean} [preferences.pushNotifications=true] - Push notifications preference
 * @property {boolean} [preferences.privateAccount=false] - Private account setting
 * @property {Object} [voiceVideoSettings] - Voice and video call settings
 * @property {boolean} [voiceVideoSettings.allowCalls=true] - Allow voice/video calls
 * @property {boolean} [voiceVideoSettings.autoAnswer=false] - Auto-answer calls
 * @property {string} [voiceVideoSettings.preferredDevice] - Preferred audio/video device
 * @property {Array.<Object>} [giftHistory] - History of sent and received gifts
 * @property {Array.<Object>} [roomHistory] - History of joined voice/video rooms
 * @property {string} [referralCode] - Unique referral code
 * @property {mongoose.Types.ObjectId} [referredBy] - User who referred this user
 * @property {number} [invitesCount=0] - Number of successful referrals
 * @property {Date} createdAt - Auto-generated creation timestamp
 * @property {Date} updatedAt - Auto-generated update timestamp
 */

const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const userSchema = new mongoose.Schema(
  {
    profilePicture: {
      type: String,
      default: null,
    },

    userName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
    },

    bio: {
      type: String,
      maxlength: 200,
      default: "",
    },

    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
    },

    dob: {
      type: Date,
    },

    displayName: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["ONLINE", "OFFLINE", "AWAY", "BUSY"],
      default: "OFFLINE",
    },

    role: {
      type: String,
      enum: ["USER"],
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    accountStatus: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "BANNED"],
      default: "ACTIVE",
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

    warnings: [
      {
        message: String,
        reason: String,
        severity: {
          type: String,
          enum: ["LOW", "MEDIUM", "HIGH"],
          default: "LOW",
        },
        issuedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        date: {
          type: Date,
          default: Date.now,
        },
        expiresAt: Date,
      },
    ],

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    mutedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    coins: {
      type: Number,
      default: 0,
      min: 0,
    },

    wallet: {
      balance: {
        type: Number,
        default: 0,
        min: 0,
      },
      currency: {
        type: String,
        default: "USD",
      },
    },

    transactionHistory: [
      {
        transactionId: {
          type: String,
          required: true,
          default: () => uuidv4(),
        },
        type: {
          type: String,
          enum: ["TOP_UP", "GIFT_SENT", "GIFT_RECEIVED", "PURCHASE", "REFUND"],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        description: String,
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        receiver: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED"],
          default: "PENDING",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    passwordResetToken: {
      type: String,
      default: null,
    },

    passwordResetExpires: {
      type: Date,
      default: null,
    },

    phoneVerification: {
      otp: {
        type: String,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
      attempts: {
        type: Number,
        default: 0,
      },
    },

    media: [
      {
        type: {
          type: String,
          enum: ["IMAGE", "VIDEO"],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        thumbnail: String,
        description: String,
        isPublic: {
          type: Boolean,
          default: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
      privateAccount: {
        type: Boolean,
        default: false,
      },
      showOnlineStatus: {
        type: Boolean,
        default: true,
      },
      allowDirectMessages: {
        type: Boolean,
        default: true,
      },
      language: {
        type: String,
        default: "en",
      },
    },

    voiceVideoSettings: {
      allowCalls: {
        type: Boolean,
        default: true,
      },
      autoAnswer: {
        type: Boolean,
        default: false,
      },
      preferredDevice: {
        type: String,
        default: null,
      },
      noiseCancellation: {
        type: Boolean,
        default: true,
      },
      videoQuality: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", "HD"],
        default: "MEDIUM",
      },
    },

    giftHistory: [
      {
        giftId: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["SENT", "RECEIVED"],
          required: true,
        },
        giftType: {
          type: String,
          required: true,
        },
        coins: {
          type: Number,
          required: true,
        },
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        receiver: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        message: String,
        sentAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    roomHistory: [
      {
        roomId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        roomName: String,
        type: {
          type: String,
          enum: ["VOICE", "VIDEO", "TEXT"],
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        leftAt: Date,
        duration: Number, // in minutes
      },
    ],

    referralCode: {
      type: String,
      unique: true,
      default: () => uuidv4().slice(0, 8).toUpperCase(),
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    invitesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for followers count
userSchema.virtual("followersCount").get(function () {
  return this.followers.length;
});

// Virtual for following count
userSchema.virtual("followingCount").get(function () {
  return this.following.length;
});

// Index for better query performance
userSchema.index({ userName: "text", displayName: "text" });
userSchema.index({ status: 1 });
userSchema.index({ "wallet.balance": -1 });
userSchema.index({ coins: -1 });

module.exports = mongoose.model("User", userSchema);
