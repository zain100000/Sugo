const bcrypt = require("bcrypt");

/**
 * @constant PASSWORD_REGEX
 * @description Regular expression enforcing strong password rules:
 * Must be at least 8 characters long, include at least one uppercase letter,
 * one lowercase letter, one digit, and one special character.
 * @type {RegExp}
 */
exports.passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * @function hashPassword
 * @description Hashes a given password using bcrypt for secure storage.
 * @param {string} password - The plain text password to hash.
 * @returns {Promise<string>} The securely hashed password.
 */
exports.hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};
