// src/utils/emailService.js
const nodemailer = require("nodemailer");

const DEFAULT_SENDER = process.env.EMAIL_FROM || process.env.GMAIL_ADRESI;

async function sendEmail({ to, subject, text, html }) {
  const GMAIL_USER = process.env.GMAIL_ADRESI;
  const GMAIL_PASS = process.env.GMAIL_SIFRESI;

  if (!GMAIL_USER || !GMAIL_PASS) {
    console.log("📧 Outgoing email (simulated — Gmail env missing):");
    console.log(JSON.stringify({ from: DEFAULT_SENDER, to, subject, text, html }, null, 2));
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS, // App Password
    },
  });

  await transporter.sendMail({
    from: DEFAULT_SENDER || GMAIL_USER,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendEmail };
