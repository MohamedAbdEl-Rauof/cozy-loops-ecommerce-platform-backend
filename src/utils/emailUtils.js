const nodemailer = require('nodemailer');
const crypto = require('crypto');

/**
 * Create email transporter using Gmail SMTP
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, 
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false 
    }
  });
};

/**
 * Send email
 */
const sendEmail = async (options) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Generate verification token
 */
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create verification URL
 */
const createVerificationUrl = (token) => {
  return `${process.env.USER_FRONTEND_URL}/auth/verify-email?token=${token}`;
};

/**
 * Create verification email HTML
 */
const createVerificationEmailHtml = (firstName, verificationUrl) => {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">Welcome to Cozy Loops!</h2>
      <p>Hello ${firstName},</p>
      <p>Thank you for registering with Cozy Loops. Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
      </div>
      <p>If the button doesn't work, you can also click on the link below or copy and paste it into your browser:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>This verification link will expire in 24 hours.</p>
      <p>If you did not create an account, please ignore this email.</p>
      <p>Best regards,<br>The Cozy Loops Team</p>
    </div>
  `;
};

module.exports = {
  sendEmail,
  generateVerificationToken,
  createVerificationUrl,
  createVerificationEmailHtml
};
