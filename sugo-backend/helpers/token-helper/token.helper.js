const crypto = require("crypto");

/**
 * @function generateSecureToken
 * @description Generates a cryptographically secure random token for authentication or verification purposes.
 * @returns {string} A secure random token represented in hexadecimal format.
 */

exports.generateSecureToken = () => {
  return crypto.randomBytes(32).toString("hex");
};
