/**
 * Digis Email System
 * All emails go through Resend for consistent branding and deliverability
 */

// Core email sending
export { sendEmail, resend } from './resend';

// Template system
export { baseEmailTemplate, infoBox, featureList, alertBox, codeBlock } from './templates';

// Welcome emails
export { sendWelcomeEmail } from './welcome';

// Payout notifications
export {
  sendPayoutRequestEmail,
  sendPayoutProcessingEmail,
  sendPayoutCompletedEmail,
  sendPayoutFailedEmail,
  sendCoinPurchaseEmail,
} from './payout-notifications';

// Creator notifications
export {
  sendCreatorApprovalEmail,
  addCreatorToAudience,
  removeCreatorFromAudience,
} from './creator-notifications';

// Fan activity notifications (to creators)
export {
  sendNewSubscriberEmail,
  sendFollowerMilestoneEmail,
  sendTipReceivedEmail,
  sendCallCompletedEmail,
  sendWeeklyEarningsEmail,
} from './fan-notifications';

// Creator invite campaigns
export {
  sendCreatorInviteEmail,
  sendBulkCreatorInvites,
} from './creator-invite-campaign';

// Creator earnings reports
export {
  sendEarningsReport,
} from './creator-earnings';
