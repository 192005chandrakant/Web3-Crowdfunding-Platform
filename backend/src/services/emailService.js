const { Resend } = require("resend");

function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function createResendClient() {
  if (!isResendConfigured()) {
    throw new Error("Missing Resend API key");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendNotificationEmail({ to, subject, html }) {
  if (!isResendConfigured()) {
    console.warn("[email] Resend not configured; skipping send to", to);
    return { skipped: true };
  }

  const resend = createResendClient();
  const from = process.env.RESEND_FROM_EMAIL || "notifications@milestonechain.dev";

  const result = await resend.emails.send({
    from,
    to,
    subject,
    html
  });

  return result;
}

async function sendMilestoneNotification({ email, campaignTitle, milestoneTitle, actionUrl }) {
  const subject = `Milestone update: ${campaignTitle}`;
  const html = `
    <h2>${campaignTitle}</h2>
    <p>A milestone requires your attention: <strong>${milestoneTitle}</strong></p>
    <p><a href="${actionUrl}">Review milestone</a></p>
  `;

  return sendNotificationEmail({ to: email, subject, html });
}

async function sendProofSubmittedNotification({ emails, campaignTitle, milestoneTitle, actionUrl }) {
  if (!emails || emails.length === 0) return { skipped: true };

  const subject = `Proof Submitted: ${campaignTitle}`;
  const html = `
    <h2>${campaignTitle}</h2>
    <p>Proof has been submitted for <strong>${milestoneTitle}</strong>.</p>
    <p>Please review the proof and cast your vote!</p>
    <p><a href="${actionUrl}">View Campaign</a></p>
  `;

  // Resend supports sending to multiple BCC or looping. For simplicity, we loop.
  return Promise.all(emails.map(email => sendNotificationEmail({ to: email, subject, html })));
}

async function sendDonationReceivedNotification({ email, campaignTitle, amount, actionUrl }) {
  const subject = `New Donation to ${campaignTitle}!`;
  const html = `
    <h2>Great news!</h2>
    <p>You received a donation of <strong>${amount} MATIC</strong> for your campaign: ${campaignTitle}.</p>
    <p><a href="${actionUrl}">View Dashboard</a></p>
  `;

  return sendNotificationEmail({ to: email, subject, html });
}

module.exports = {
  isResendConfigured,
  sendNotificationEmail,
  sendMilestoneNotification,
  sendProofSubmittedNotification,
  sendDonationReceivedNotification
};
