import nodemailer from "nodemailer";
import config from "../config/config";

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure, // true for 465, false for other ports
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error("Email service error:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const mailOptions = {
    from: `"Fidelity Trust" <${config.email.user}>`,
    ...options,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export const sendWelcomeEmail = async (
  email: string,
  firstName: string,
  accountNumber: string
): Promise<void> => {
  const subject = "Welcome to Fidelity Trust!";
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Fidelity Trust</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #1a237e;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            padding: 20px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 0 0 5px 5px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #1a237e;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .account-info {
            background-color: #e8eaf6;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to Fidelity Trust!</h1>
        </div>
        <div class="content">
          <p>Dear ${firstName},</p>
          
          <p>Welcome to Fidelity Trust! We're excited to have you join our community of trusted banking customers.</p>
          
          <div class="account-info">
            <h3>Your Account Information</h3>
            <p><strong>Account Number:</strong> ${accountNumber}</p>
          </div>
          
          <p>To get started with your new account, please download our mobile app:</p>
          
          <div style="text-align: center;">
            <a href="${
              config.app.appStoreLink
            }" class="button">Download Our App</a>
          </div>
          
          <p>With our app, you can:</p>
          <ul>
            <li>Check your account balance</li>
            <li>Transfer money securely</li>
            <li>Pay bills</li>
            <li>Manage your investments</li>
            <li>And much more!</li>
          </ul>
          
          <p>If you have any questions or need assistance, our customer support team is available 24/7 to help you.</p>
          
          <p>Best regards,<br>The Fidelity Trust Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Fidelity Trust. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  await sendEmail({ to: email, subject, html });
};
