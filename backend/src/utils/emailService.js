const DEFAULT_SENDER = process.env.EMAIL_FROM || "no-reply@uvrms.local";
const webhookUrl = process.env.EMAIL_WEBHOOK_URL;

function buildPayload({ to, subject, text, html }) {
  return {
    from: DEFAULT_SENDER,
    to,
    subject,
    text,
    html,
  };
}

async function sendEmail({ to, subject, text, html }) {
  const payload = buildPayload({ to, subject, text, html });

  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Email webhook responded with status ${response.status}: ${body}`
      );
    }
  }

  console.log("📧 Outgoing email (simulated if no webhook configured):");
  console.log(JSON.stringify(payload, null, 2));
}

module.exports = { sendEmail };
