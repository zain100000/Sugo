/**
 * @fileoverview Email helper for Sugo platform.
 * Handles sending transactional and status update emails such as OTP, password reset,
 * and user status notifications using Nodemailer with Gmail SMTP.
 * @module utils/emailHelper
 */

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
});

/**
 * Sends an email using Sugo’s configured transporter.
 * @async
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @returns {Promise<boolean>} True if sent successfully, otherwise false
 */
const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"Sugo" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error("❌ Email failed:", err.message);
    return false;
  }
};

/**
 * Generates a branded HTML email template for Sugo.
 * @param {string} content - Inner HTML content
 * @param {string} [title] - Email title
 * @returns {string} Full HTML email
 */
const getEmailTemplate = (content, title = "") => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#f7f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f9fc;">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#1E88E5 0%,#1565C0 100%);padding:30px;text-align:center;">
              <img src="https://res.cloudinary.com/dd524q9vc/image/upload/v1759753418/Sugo/logo/logo_wfpojd.jpg" alt="Sugo" style="width:140px;height:auto;"/>
              <h1 style="color:#fff;font-size:24px;margin:15px 0 0;font-weight:600;">Sugo</h1>
              <p style="color:#e3f2fd;font-size:14px;margin:8px 0 0;">Smart Connections, Real People 💫</p>
            </td>
          </tr>
          <tr><td style="padding:40px 30px;">${content}</td></tr>
          <tr>
            <td style="background:#f8f9fa;padding:25px 30px;text-align:center;border-top:1px solid #e9ecef;">
              <p style="margin:0;color:#6c757d;font-size:14px;line-height:1.6;">
                &copy; 2025 Sugo. All rights reserved.<br>
                <span style="font-size:12px;color:#868e96;">
                  You are receiving this email as a registered member of Sugo.<br>
                  If this wasn’t you, please contact our support team immediately.
                </span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Sends a password reset email for Sugo users.
 * @async
 * @param {string} toEmail - Recipient email address
 * @param {string} resetToken - Password reset token
 * @returns {Promise<boolean>}
 */
exports.sendPasswordResetEmail = async (toEmail, resetToken) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const content = `
    <div style="text-align:center;">
      <h2 style="color:#2d3748;font-size:24px;margin-bottom:20px;font-weight:600;">Reset Your Password</h2>
      <p style="color:#4a5568;line-height:1.6;margin-bottom:25px;">
        We received a request to reset your Sugo account password. Click below to continue:
      </p>
      <a href="${resetLink}" style="background:linear-gradient(135deg,#1E88E5 0%,#1565C0 100%);color:white;padding:16px 32px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;font-size:16px;">
        Reset Password
      </a>
      <p style="color:#718096;font-size:14px;margin-top:20px;">This link is valid for 1 hour. If you didn’t request it, please ignore this email.</p>
    </div>
  `;
  return sendEmail({
    to: toEmail,
    subject: "Reset Your Sugo Password",
    html: getEmailTemplate(content, "Password Reset"),
  });
};


