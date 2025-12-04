import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const transporter: Transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailService = {
  async sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
      });
      console.log(`✅ Email sent to ${to}`);
      return true;
    } catch (error) {
      console.error("❌ Email send error:", error);
      return false;
    }
  },

  async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome to Fyrmnzia Tasks! 🎉</h1>
          <p>Thank you for signing up. Please verify your email address to get started.</p>
          <p>
            <a href="${verifyUrl}" class="button">Verify Email Address</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
          <div class="footer">
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: "Verify your Fyrmnzia Tasks account",
      html,
    });
  },

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #EF4444; color: white; text-decoration: none; border-radius: 6px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Reset Your Password</h1>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p>
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <div class="footer">
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: "Reset your Fyrmnzia Tasks password",
      html,
    });
  },

  async sendReminderEmail(email: string, taskTitle: string, dueDate: Date): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .task-box { background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⏰ Task Reminder</h1>
          <p>This is a reminder for your upcoming task:</p>
          <div class="task-box">
            <h2>${taskTitle}</h2>
            <p><strong>Due:</strong> ${dueDate.toLocaleString()}</p>
          </div>
          <p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks" class="button">View Task</a>
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Reminder: ${taskTitle}`,
      html,
    });
  },
};
