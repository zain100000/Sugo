/**
 * @fileoverview Email helper for Sugo platform.
 * Handles sending transactional and status update emails such as OTP, password reset,
 * and user status notifications using Nodemailer with Gmail SMTP.
 * @module utils/emailHelper
 */

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 25,
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

/**
 * Sends a one-time password (OTP) email.
 * @async
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - One-time password code
 * @returns {Promise<boolean>}
 */
exports.sendOTPEmail = async (toEmail, otp) => {
  const content = `
    <div style="text-align:center;">
      <h2 style="color:#2d3748;font-size:24px;margin-bottom:20px;font-weight:600;">Your Sugo Verification Code</h2>
      <p style="color:#4a5568;line-height:1.6;margin-bottom:25px;">
        Use the code below to verify your account:
      </p>
      <div style="background:linear-gradient(135deg,#1E88E5 0%,#1565C0 100%);color:white;padding:20px;border-radius:12px;margin:25px 0;display:inline-block;">
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;">${otp}</div>
      </div>
      <p style="color:#e53e3e;font-size:14px;">This code expires in 5 minutes.</p>
    </div>
  `;
  return sendEmail({
    to: toEmail,
    subject: "Your Sugo Verification Code",
    html: getEmailTemplate(content, "Verification Code"),
  });
};

/**
 * Sends a user status update email (e.g., WARNED, SUSPENDED, BANNED, ACTIVE).
 * @async
 * @param {string} toEmail - Recipient email address
 * @param {string} status - User account status
 * @param {number} [warningCount=0] - Number of warnings (if applicable)
 * @param {string} [warningMessage=""] - Message for warning
 * @returns {Promise<boolean>}
 */
exports.sendUserStatusUpdateEmail = async (
  toEmail,
  status,
  warningCount = 0,
  warningMessage = ""
) => {
  let subject, content;

  switch (status) {
    case "WARNED":
      subject = `⚠️ Warning Notice - Sugo Account (#${warningCount})`;
      content = `
        <div style="text-align:center;">
          <h2 style="color:#d69e2e;font-size:24px;margin-bottom:20px;font-weight:600;">Account Warning</h2>
          <p style="color:#4a5568;line-height:1.6;margin-bottom:20px;">
            Your Sugo account has received a warning for violating our community guidelines.
          </p>
          <div style="background:#fffaf0;border:1px solid #d69e2e;border-radius:8px;padding:20px;margin:25px 0;">
            <p style="color:#744210;">"${warningMessage}"</p>
            <p style="color:#744210;">Warning ${warningCount} of 3</p>
          </div>
          <p style="color:#718096;">After 3 warnings, your account may be suspended.</p>
        </div>
      `;
      break;

    case "SUSPENDED":
      subject = "🚫 Account Suspended - Sugo";
      content = `
        <div style="text-align:center;">
          <h2 style="color:#e53e3e;font-size:24px;margin-bottom:20px;font-weight:600;">Account Suspended</h2>
          <p style="color:#4a5568;">Your Sugo account has been suspended due to repeated violations.</p>
          <p style="color:#718096;">Please contact support if you believe this is an error.</p>
        </div>
      `;
      break;

    case "BANNED":
      subject = "🚫 Permanent Ban - Sugo Account Terminated";
      content = `
        <div style="text-align:center;">
          <h2 style="color:#c53030;font-size:24px;margin-bottom:20px;font-weight:600;">Account Permanently Banned</h2>
          <p style="color:#4a5568;">Your Sugo account has been permanently banned for severe violations.</p>
          <p style="color:#718096;">This decision is final and cannot be appealed.</p>
        </div>
      `;
      break;

    case "ACTIVE":
      subject = "✅ Account Restored - Welcome Back to Sugo";
      content = `
        <div style="text-align:center;">
          <h2 style="color:#38a169;font-size:24px;margin-bottom:20px;font-weight:600;">Account Restored</h2>
          <p style="color:#4a5568;">Your Sugo account is now active again. Welcome back!</p>
        </div>
      `;
      break;

    default:
      return false;
  }

  return sendEmail({
    to: toEmail,
    subject,
    html: getEmailTemplate(content, "Account Status Update"),
  });
};
