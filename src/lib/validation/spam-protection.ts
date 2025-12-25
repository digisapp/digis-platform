// Spam protection utilities

// Known spam domains
const SPAM_DOMAINS = new Set([
  'slclogin.com',
  'approject.net',
  'gmxxail.com',
  'tempmail.com',
  'guerrillamail.com',
  'mailinator.com',
  'throwaway.email',
  'fakeinbox.com',
  'trashmail.com',
  'tempinbox.com',
  'dispostable.com',
  'getnada.com',
  'maildrop.cc',
  'yopmail.com',
  '10minutemail.com',
  'temp-mail.org',
  'emailondeck.com',
  'mohmal.com',
  'tempr.email',
  'discard.email',
  'spamgourmet.com',
  'mytemp.email',
  'tmpmail.org',
  'bupmail.com',
  'mailsac.com',
]);

// Common typosquats of popular email providers
const TYPOSQUAT_PATTERNS: [RegExp, string][] = [
  [/^gm[a-z]*ail\.com$/i, 'gmail.com'],      // gmxxail, gmmail, gmaail
  [/^gmai[a-z]+\.com$/i, 'gmail.com'],        // gmaill, gmailll
  [/^g[a-z]*mail\.com$/i, 'gmail.com'],       // gomail, gnmail
  [/^hotm[a-z]*il\.com$/i, 'hotmail.com'],    // hotmmail, hotmaill
  [/^yah[a-z]*oo\.com$/i, 'yahoo.com'],       // yahooo, yahhoo
  [/^outl[a-z]*ook\.com$/i, 'outlook.com'],   // outllook, outlookk
  [/^icl[a-z]*oud\.com$/i, 'icloud.com'],     // iclooud, iclould
];

/**
 * Check if an email domain is blocked (spam or disposable)
 */
export function isBlockedDomain(email: string): { blocked: boolean; reason?: string } {
  const domain = email.toLowerCase().split('@')[1];

  if (!domain) {
    return { blocked: true, reason: 'Invalid email format' };
  }

  // Check exact spam domain match
  if (SPAM_DOMAINS.has(domain)) {
    return { blocked: true, reason: 'This email provider is not allowed' };
  }

  // Check for typosquats
  for (const [pattern, legitimate] of TYPOSQUAT_PATTERNS) {
    if (pattern.test(domain) && domain !== legitimate) {
      return { blocked: true, reason: `Did you mean ${legitimate}?` };
    }
  }

  return { blocked: false };
}

/**
 * Validate honeypot field - should be empty for real users
 * Bots typically fill all form fields including hidden ones
 */
export function isHoneypotTriggered(honeypotValue: string | undefined | null): boolean {
  return !!honeypotValue && honeypotValue.trim().length > 0;
}

/**
 * Check for suspicious patterns in signup data
 */
export function hasSpamPatterns(data: {
  email: string;
  username: string;
  displayName?: string;
}): { suspicious: boolean; reason?: string } {
  const email = data.email.toLowerCase();
  const username = data.username.toLowerCase();

  // Check if email name portion is completely different from username
  // This catches bots that use mismatched data
  const emailName = email.split('@')[0].replace(/[^a-z]/g, '');
  const cleanUsername = username.replace(/[^a-z]/g, '');

  // If both are reasonably long and share no common substring of 3+ chars, flag it
  if (emailName.length >= 5 && cleanUsername.length >= 5) {
    let hasCommon = false;
    for (let i = 0; i <= emailName.length - 3; i++) {
      if (cleanUsername.includes(emailName.substring(i, i + 3))) {
        hasCommon = true;
        break;
      }
    }
    // This is just informational, not blocking - some users legitimately have different names
    if (!hasCommon) {
      return { suspicious: true, reason: 'Mismatched email and username' };
    }
  }

  return { suspicious: false };
}
