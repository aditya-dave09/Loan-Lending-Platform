const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../config/logger');

/**
 * Email service using Nodemailer.
 * In development, logs emails to console instead of sending.
 */
class EmailService {
  constructor() {
    this.transporter = null;
  }

  _getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    // In development without SMTP config, use a mock
    if (config.env === 'development' && !config.email.user) {
      logger.info('Email: running in mock mode (no SMTP configured)');
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });

    return this.transporter;
  }

  /**
   * Send an email.
   *
   * @param {object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML body
   * @param {string} [options.text] - Plain text body
   */
  async send({ to, subject, html, text }) {
    try {
      const transporter = this._getTransporter();

      if (!transporter) {
        // Mock mode — just log
        logger.info('Email (mock):', { to, subject });
        return { messageId: 'mock-' + Date.now() };
      }

      const result = await transporter.sendMail({
        from: config.email.from,
        to,
        subject,
        html,
        text,
      });

      logger.info('Email sent:', { to, subject, messageId: result.messageId });
      return result;
    } catch (error) {
      logger.error('Email send failed:', { to, subject, error: error.message });
      // Don't throw — email failures shouldn't break the main flow
    }
  }

  /**
   * Send OTP email.
   */
  async sendOTP(to, otp, agreementNumber) {
    return this.send({
      to,
      subject: `LoanForge — OTP for Signing Agreement ${agreementNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">LoanForge</h2>
          <p>Your OTP for signing agreement <strong>${agreementNumber}</strong> is:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${otp}</span>
          </div>
          <p style="color: #666;">This OTP expires in 5 minutes. Do not share it with anyone.</p>
          <hr style="border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999;">This email was sent by LoanForge. If you didn't request this, please ignore it.</p>
        </div>
      `,
    });
  }

  /**
   * Send payment reminder email.
   */
  async sendPaymentReminder(to, { name, agreementNumber, amount, dueDate }) {
    return this.send({
      to,
      subject: `LoanForge — Payment Reminder for ${agreementNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">LoanForge</h2>
          <p>Hi ${name},</p>
          <p>This is a reminder that your payment of <strong>₹${amount}</strong> for agreement
          <strong>${agreementNumber}</strong> is due on <strong>${dueDate}</strong>.</p>
          <p>Please make the payment on time to avoid any late fees.</p>
          <hr style="border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999;">LoanForge — Formalizing personal loans.</p>
        </div>
      `,
    });
  }
}

module.exports = new EmailService();
