const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  authLimiter,
} = require("../../middlewares/auth.middleware");
const profilePictureUpload = require("../../utilities/cloudinary/cloudinary.utility");
const superAdminController = require("../../controllers/super-admin-controller/super-admin.controller");

/**
 * @description Route for Super Admin registration.
 */
router.post(
  "/signup-super-admin",
  profilePictureUpload.upload,
  superAdminController.registerSuperAdmin
);

/**
 * @description Route for Super Admin sign-in.
 */
router.post(
  "/signin-super-admin",
  authLimiter,
  superAdminController.loginSuperAdmin
);

/**
 * @description Route to get a Super Admin's details by ID.
 */
router.get(
  "/get-super-admin-by-id/:superAdminId",
  authMiddleware,
  superAdminController.getSuperAdminById
);

/**
 * @description Route to send an email for a password reset.
 */
router.post("/forgot-password", superAdminController.forgotPassword);

/**
 * @description Route to reset a password using a token.
 */
router.post(
  "/reset-password/:token",
  superAdminController.resetPasswordWithToken
);

/**
 * @description Route to verify a password reset token.
 */
router.post(
  "/verify-reset-token/:token",
  superAdminController.verifyResetToken
);

/**
 * @description Route for Super Admin logout.
 */
router.post(
  "/logout-super-admin",
  authMiddleware,
  superAdminController.logoutSuperAdmin
);

/**
 * @description Route to update user status.
 */
router.patch(
  "/user/update-user-status/:userId",
  authMiddleware,
  superAdminController.updateUserStatus
);

module.exports = router;
