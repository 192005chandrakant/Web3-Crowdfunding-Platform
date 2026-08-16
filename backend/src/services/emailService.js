const { Resend } = require("resend");

function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function createResendClient() {
  if (!isResendConfigured()) {
    throw new Error("Missing Resend API key");
  }
  return new Resend(process.env.RESEND_API_KEY.trim());
}

async function sendNotificationEmail({ to, subject, html, text, tags }) {
  if (!to) {
    throw new Error("Email recipient is required");
  }

  const resend = createResendClient();
  const from = process.env.RESEND_FROM_EMAIL || "notifications@milestonechain.dev";

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
    tags
  });

  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }

  return data;
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
  if (!emails || emails.length === 0) {
    throw new Error("At least one proof notification recipient is required");
  }

  const subject = `Proof Submitted: ${campaignTitle}`;
  const html = `
    <h2>${campaignTitle}</h2>
    <p>Proof has been submitted for <strong>${milestoneTitle}</strong>.</p>
    <p>Please review the proof and cast your vote!</p>
    <p><a href="${actionUrl}">View Campaign</a></p>
  `;

  return sendNotificationEmail({ to: emails, subject, html });
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
