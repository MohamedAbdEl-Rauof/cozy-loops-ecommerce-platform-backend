/**
 * Create OTP email HTML
 * @param {String} firstName - User's first name
 * @param {String} otp - One-time password
 * @returns {String} HTML email content
 */
exports.createOTPEmailHtml = (firstName, otp) => {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">Password Reset Code</h2>
      <p>Hello ${firstName},</p>
      <p>You requested to reset your password. Please use the following code to verify your identity:</p>
      <div style="text-align: center; margin: 30px 0;">
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 8px; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">${otp}</div>
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
      <p>Best regards,<br>The Cozy Loops Team</p>
    </div>
  `;
};

/**
 * Create password reset confirmation email HTML
 * @param {String} firstName - User's first name
 * @returns {String} HTML email content
 */
exports.createPasswordResetConfirmationHtml = (firstName) => {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">Password Reset Successful</h2>
      <p>Hello ${firstName},</p>
      <p>Your password has been successfully reset.</p>
      <p>If you did not perform this action, please contact our support team immediately.</p>
      <p>Best regards,<br>The Cozy Loops Team</p>
    </div>
  `;
};