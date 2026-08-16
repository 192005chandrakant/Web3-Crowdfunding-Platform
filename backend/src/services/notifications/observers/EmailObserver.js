const User = require("../../../models/User");
const {
  isResendConfigured,
  sendNotificationEmail,
  sendMilestoneNotification,
  sendDonationReceivedNotification,
  sendProofSubmittedNotification
} = require("../../emailService");

/**
 * EmailObserver - Concrete Observer responsible for sending real-time transactional HTML emails
 * to users via Resend based on event type and preferences.
 */
class EmailObserver {
  async onNotify(event) {
    // Allow explicitly disabling emails per event if requested
    if (event.sendEmail === false) {
      return { skipped: true, reason: "Email delivery explicitly disabled for this event" };
    }

    if (!isResendConfigured()) {
      return { error: "Resend API key is not configured" };
    }

    try {
      // Lookup target email address either from payload or User model
      let targetEmail = event.recipientEmail;
      if (!targetEmail) {
        const user = await User.findOne({ walletAddress: event.walletAddress.toLowerCase() }).lean();
        targetEmail = user?.email;
      }

      if (!targetEmail) {
        return { skipped: true, reason: "No target email address registered" };
      }

      const actionUrl = event.metadata?.actionUrl || process.env.FRONTEND_URL || "http://localhost:5173";
      const campaignTitle = event.metadata?.campaignTitle || "MilestoneChain Campaign";
      let res;

      // Select template according to notification type or generic notification email
      switch (event.type) {
        case "milestone_proof":
          res = await sendProofSubmittedNotification({
            emails: [targetEmail],
            campaignTitle,
            milestoneTitle: event.title,
            actionUrl
          });
          break;

        case "tranche_released":
        case "voting_open":
          res = await sendMilestoneNotification({
            email: targetEmail,
            campaignTitle,
            milestoneTitle: event.title,
            actionUrl
          });
          break;

        case "donation_received":
          res = await sendDonationReceivedNotification({
            email: targetEmail,
            campaignTitle,
            amount: event.metadata?.amount || "Some",
            actionUrl
          });
          break;

        default:
          // Generic structured HTML email template
          res = await sendNotificationEmail({
            to: targetEmail,
            subject: `[MilestoneChain] ${event.title}`,
            html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b;">
                <div style="text-align: center; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 24px;">
                  <h1 style="color: #38bdf8; margin: 0; font-size: 24px;">MilestoneChain</h1>
                  <p style="color: #94a3b8; font-size: 14px; margin: 4px 0 0;">Decentralized Crowdfunding & Governance</p>
                </div>
                <h2 style="color: #f8fafc; font-size: 20px; margin-top: 0;">${event.title}</h2>
                <p style="color: #cbd5e1; font-size: 16px; line-height: 1.5;">${event.message}</p>
                <div style="margin: 32px 0; text-align: center;">
                  <a href="${actionUrl}" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);">View in Dashboard</a>
                </div>
                <div style="border-top: 1px solid #334155; padding-top: 16px; font-size: 12px; color: #64748b; text-align: center;">
                  <p>You received this notification because your wallet (${event.walletAddress}) is subscribed to MilestoneChain activity.</p>
                </div>
              </div>
            `
          });
          break;
      }

      event.emailSent = !res?.skipped && !res?.error;
      console.log(`[EmailObserver] Email notification sent to ${targetEmail} for event '${event.title}'`, res?.id ? `(ID: ${res.id})` : "");
      return res;
    } catch (error) {
      console.error(`[EmailObserver] Error sending email notification to ${event.walletAddress}:`, error.message);
      // We log clearly instead of rethrowing so observer Promise.allSettled records it without crashing the pipeline
      return { error: error.message };
    }
  }
}

module.exports = new EmailObserver();
