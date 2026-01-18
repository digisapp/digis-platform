import { sendEmail } from './resend';
import { baseEmailTemplate, infoBox, featureList } from './templates';
import { formatCoinsAsUSD } from '@/lib/stripe/constants';

/**
 * Fan notification emails
 * Emails sent to creators about fan activity
 */

interface NewSubscriberData {
  creatorEmail: string;
  creatorName: string;
  fanUsername: string;
  fanDisplayName: string;
  tierName: string;
  tierPrice: number; // in coins
  isFirstSubscriber?: boolean;
}

interface NewFollowerData {
  creatorEmail: string;
  creatorName: string;
  fanUsername: string;
  fanDisplayName: string;
  totalFollowers: number;
}

interface TipReceivedData {
  creatorEmail: string;
  creatorName: string;
  fanUsername: string;
  fanDisplayName: string;
  amount: number; // in coins
  message?: string;
  source: 'stream' | 'dm' | 'content' | 'call';
}

interface CallCompletedData {
  creatorEmail: string;
  creatorName: string;
  fanUsername: string;
  fanDisplayName: string;
  duration: number; // in minutes
  earnings: number; // in coins
  callType: 'video' | 'voice';
}

/**
 * Send new subscriber notification to creator
 */
export async function sendNewSubscriberEmail(data: NewSubscriberData) {
  const earnings = formatCoinsAsUSD(data.tierPrice);

  const html = baseEmailTemplate({
    preheader: `${data.fanDisplayName} just subscribed to you!`,
    title: data.isFirstSubscriber ? 'Your First Subscriber!' : 'New Subscriber!',
    emoji: data.isFirstSubscriber ? '🎊' : '💖',
    greeting: `Hey ${data.creatorName}! 👋`,
    body: `
      <p style="margin: 0 0 16px;">
        ${data.isFirstSubscriber
          ? "This is a huge milestone — you just got your first subscriber! 🎉"
          : "You just got a new subscriber!"
        }
      </p>

      ${infoBox([
        { label: 'Fan', value: `@${data.fanUsername}` },
        { label: 'Tier', value: data.tierName },
        { label: 'You Earned', value: earnings },
      ])}

      <p style="margin: 16px 0 0;">
        ${data.isFirstSubscriber
          ? "This is just the beginning. Keep creating amazing content and watch your community grow!"
          : "Your content is clearly resonating. Keep up the great work!"
        }
      </p>
    `,
    ctaText: 'View Subscribers',
    ctaUrl: 'https://digis.cc/creator/dashboard',
    footerNote: data.isFirstSubscriber ? "We're so excited for you! 🚀" : undefined,
  });

  const text = `
Hey ${data.creatorName}!

${data.isFirstSubscriber ? "🎊 Congrats on your first subscriber!" : "You got a new subscriber!"}

Fan: @${data.fanUsername}
Tier: ${data.tierName}
You Earned: ${earnings}

${data.isFirstSubscriber ? "This is just the beginning!" : "Keep up the great work!"}

View subscribers: https://digis.cc/creator/dashboard

- The Digis Team
  `.trim();

  return await sendEmail({
    to: data.creatorEmail,
    subject: data.isFirstSubscriber
      ? `🎊 Your First Subscriber! @${data.fanUsername} just subscribed`
      : `💖 New Subscriber: @${data.fanUsername}`,
    html,
    text,
  });
}

/**
 * Send milestone follower notification (100, 500, 1000, etc.)
 */
export async function sendFollowerMilestoneEmail(data: NewFollowerData) {
  const html = baseEmailTemplate({
    preheader: `You just hit ${data.totalFollowers.toLocaleString()} followers!`,
    title: `${data.totalFollowers.toLocaleString()} Followers!`,
    emoji: '🎯',
    greeting: `Hey ${data.creatorName}! 👋`,
    body: `
      <p style="margin: 0 0 16px;">
        You just hit <strong>${data.totalFollowers.toLocaleString()} followers</strong> — and @${data.fanUsername} was the one who got you there! 🎉
      </p>

      <div style="text-align: center; padding: 24px 0;">
        <span style="font-size: 64px;">🏆</span>
      </div>

      <p style="margin: 16px 0 0; text-align: center; color: #d1d5db;">
        Your community is growing! Keep engaging with your fans and creating content they love.
      </p>
    `,
    ctaText: 'View Your Profile',
    ctaUrl: `https://digis.cc/${data.creatorName}`,
    footerNote: 'Share this milestone with your fans! 🚀',
  });

  return await sendEmail({
    to: data.creatorEmail,
    subject: `🎯 Milestone: You hit ${data.totalFollowers.toLocaleString()} followers!`,
    html,
    text: `Congrats! You just hit ${data.totalFollowers.toLocaleString()} followers on Digis!`,
  });
}

/**
 * Send tip received notification to creator
 */
export async function sendTipReceivedEmail(data: TipReceivedData) {
  const amount = formatCoinsAsUSD(data.amount);
  const sourceLabels = {
    stream: 'during your live stream',
    dm: 'in DMs',
    content: 'on your content',
    call: 'after a call',
  };

  const html = baseEmailTemplate({
    preheader: `@${data.fanUsername} sent you ${amount}!`,
    title: 'You Got a Tip!',
    emoji: '🎁',
    greeting: `Hey ${data.creatorName}! 👋`,
    body: `
      <p style="margin: 0 0 16px;">
        <strong>@${data.fanUsername}</strong> just tipped you ${sourceLabels[data.source]}!
      </p>

      ${infoBox([
        { label: 'From', value: `@${data.fanUsername}` },
        { label: 'Amount', value: amount },
        { label: 'Source', value: sourceLabels[data.source].replace('your ', '').replace('a ', '') },
      ])}

      ${data.message ? `
        <div style="background: rgba(255, 255, 255, 0.05); border-left: 3px solid #00D4FF; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Message</p>
          <p style="margin: 8px 0 0; color: #ffffff; font-size: 15px; font-style: italic;">"${data.message}"</p>
        </div>
      ` : ''}

      <p style="margin: 16px 0 0;">
        Your fans love what you do. Keep it up! 💪
      </p>
    `,
    ctaText: 'View Earnings',
    ctaUrl: 'https://digis.cc/creator/earnings',
  });

  return await sendEmail({
    to: data.creatorEmail,
    subject: `🎁 @${data.fanUsername} tipped you ${amount}!`,
    html,
    text: `@${data.fanUsername} just tipped you ${amount} ${sourceLabels[data.source]}!`,
  });
}

/**
 * Send call completed notification to creator
 */
export async function sendCallCompletedEmail(data: CallCompletedData) {
  const earnings = formatCoinsAsUSD(data.earnings);

  const html = baseEmailTemplate({
    preheader: `You earned ${earnings} from a ${data.callType} call!`,
    title: 'Call Completed!',
    emoji: data.callType === 'video' ? '📹' : '📞',
    greeting: `Hey ${data.creatorName}! 👋`,
    body: `
      <p style="margin: 0 0 16px;">
        Your ${data.callType} call with <strong>@${data.fanUsername}</strong> just ended!
      </p>

      ${infoBox([
        { label: 'Fan', value: `@${data.fanUsername}` },
        { label: 'Duration', value: `${data.duration} min` },
        { label: 'You Earned', value: earnings },
        { label: 'Type', value: data.callType === 'video' ? '📹 Video' : '📞 Voice' },
      ])}

      <p style="margin: 16px 0 0;">
        Great call! The earnings have been added to your balance.
      </p>
    `,
    ctaText: 'View Earnings',
    ctaUrl: 'https://digis.cc/creator/earnings',
  });

  return await sendEmail({
    to: data.creatorEmail,
    subject: `${data.callType === 'video' ? '📹' : '📞'} Call completed! You earned ${earnings}`,
    html,
    text: `Your ${data.callType} call with @${data.fanUsername} is complete. You earned ${earnings}!`,
  });
}

/**
 * Weekly earnings summary email
 */
export async function sendWeeklyEarningsEmail(data: {
  creatorEmail: string;
  creatorName: string;
  totalEarnings: number;
  streamEarnings: number;
  callEarnings: number;
  dmEarnings: number;
  subscriptionEarnings: number;
  contentEarnings: number;
  newSubscribers: number;
  newFollowers: number;
}) {
  const total = formatCoinsAsUSD(data.totalEarnings);

  const html = baseEmailTemplate({
    preheader: `Your weekly earnings: ${total}`,
    title: 'Weekly Earnings Report',
    emoji: '📊',
    greeting: `Hey ${data.creatorName}! 👋`,
    body: `
      <p style="margin: 0 0 16px;">
        Here's how you did this week on Digis!
      </p>

      <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(255, 0, 110, 0.2)); border-radius: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #9ca3af; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Total Earnings</p>
        <p style="margin: 8px 0 0; color: #ffffff; font-size: 36px; font-weight: 800;">${total}</p>
      </div>

      ${infoBox([
        { label: '💬 DMs', value: formatCoinsAsUSD(data.dmEarnings) },
        { label: '📹 Calls', value: formatCoinsAsUSD(data.callEarnings) },
        { label: '🎥 Streams', value: formatCoinsAsUSD(data.streamEarnings) },
        { label: '💖 Subscriptions', value: formatCoinsAsUSD(data.subscriptionEarnings) },
        { label: '📸 Content', value: formatCoinsAsUSD(data.contentEarnings) },
      ])}

      <div style="display: flex; gap: 16px; margin-top: 20px;">
        <div style="flex: 1; text-align: center; padding: 16px; background: rgba(255, 255, 255, 0.05); border-radius: 12px;">
          <p style="margin: 0; color: #00D4FF; font-size: 24px; font-weight: 700;">+${data.newSubscribers}</p>
          <p style="margin: 4px 0 0; color: #9ca3af; font-size: 12px;">New Subs</p>
        </div>
        <div style="flex: 1; text-align: center; padding: 16px; background: rgba(255, 255, 255, 0.05); border-radius: 12px;">
          <p style="margin: 0; color: #FF006E; font-size: 24px; font-weight: 700;">+${data.newFollowers}</p>
          <p style="margin: 4px 0 0; color: #9ca3af; font-size: 12px;">New Followers</p>
        </div>
      </div>
    `,
    ctaText: 'View Full Report',
    ctaUrl: 'https://digis.cc/creator/earnings',
    footerNote: 'Keep up the amazing work! See you next week.',
  });

  return await sendEmail({
    to: data.creatorEmail,
    subject: `📊 Weekly Report: You earned ${total} this week!`,
    html,
    text: `Your weekly earnings on Digis: ${total}`,
  });
}
