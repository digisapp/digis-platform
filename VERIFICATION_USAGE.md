# Email Verification Usage Guide

This guide shows how to implement optional email verification for sensitive actions in Digis.

## 📋 Philosophy

**No verification on signup** - Users can create accounts and use the app immediately.

**Verify only when needed** - Require verification for sensitive actions like payments, becoming a creator, or withdrawals.

## 🔧 How to Use

### 1. Import the utilities

```typescript
import {
  checkEmailVerification,
  VerificationRequiredAction
} from '@/lib/email-verification';
import { VerifyEmailPrompt } from '@/components/auth/VerifyEmailPrompt';
```

### 2. Add verification check to your component

```typescript
'use client';

import { useState, useEffect } from 'react';
import { checkEmailVerification, VerificationRequiredAction } from '@/lib/email-verification';
import { VerifyEmailPrompt } from '@/components/auth/VerifyEmailPrompt';

export function CreatorApplicationPage() {
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const handleApplyAsCreator = async () => {
    // Check if email is verified
    const status = await checkEmailVerification();

    if (status.needsVerification) {
      // Show verification prompt
      setUserEmail(status.email || '');
      setShowVerifyPrompt(true);
      return;
    }

    // Email is verified, proceed with application
    proceedWithApplication();
  };

  const proceedWithApplication = async () => {
    // Your application logic here
    console.log('Processing creator application...');
  };

  return (
    <div>
      <button onClick={handleApplyAsCreator}>
        Apply to Become a Creator
      </button>

      <VerifyEmailPrompt
        isOpen={showVerifyPrompt}
        onClose={() => setShowVerifyPrompt(false)}
        action={VerificationRequiredAction.BECOME_CREATOR}
        email={userEmail}
      />
    </div>
  );
}
```

### 3. Example: Protect Payment Action

```typescript
const handlePurchase = async (contentId: string) => {
  const status = await checkEmailVerification();

  if (status.needsVerification) {
    setUserEmail(status.email || '');
    setVerificationAction(VerificationRequiredAction.PURCHASE);
    setShowVerifyPrompt(true);
    return;
  }

  // Proceed with purchase
  await processPurchase(contentId);
};
```

### 4. Example: Protect Withdrawal

```typescript
const handleWithdraw = async (amount: number) => {
  const status = await checkEmailVerification();

  if (status.needsVerification) {
    setUserEmail(status.email || '');
    setVerificationAction(VerificationRequiredAction.WITHDRAW_EARNINGS);
    setShowVerifyPrompt(true);
    return;
  }

  // Proceed with withdrawal
  await processWithdrawal(amount);
};
```

## 🎯 Actions That Should Require Verification

### Financial Actions
- ✅ Making purchases
- ✅ Tipping creators
- ✅ Buying subscriptions
- ✅ Withdrawing earnings
- ✅ Adding payment methods

### Creator Actions
- ✅ Applying to become a creator
- ✅ Going live (first time)
- ✅ Setting up monetization
- ✅ Creating paid content

### Account Security
- ✅ Changing email address
- ✅ Deleting account
- ✅ Downloading personal data

## ❌ Actions That DON'T Need Verification

### Basic Usage
- ❌ Browsing content
- ❌ Following creators
- ❌ Liking/commenting
- ❌ Viewing streams
- ❌ Basic profile updates (bio, avatar)

## 🔄 User Flow

1. **New user signs up** → No verification required, immediate access
2. **User browses and engages** → No verification needed
3. **User tries to purchase** → Verification prompt appears
4. **User clicks "Send Verification Email"** → Email sent
5. **User clicks link in email** → Email verified
6. **User returns to purchase** → Now allowed to complete action

## 🎨 Verification States

The `VerifyEmailPrompt` component has two states:

### State 1: Request Verification
- Shield icon with gradient
- Action-specific message
- "Send Verification Email" button
- "Maybe Later" option

### State 2: Email Sent
- Green checkmark
- Success message
- "Got It!" button

## 📧 Email Template

When verification is sent, users receive the `confirm-signup.html` email template with Digis branding.

## 🔐 Security Benefits

1. **Prevents fake accounts** from making purchases
2. **Ensures creator accountability** - verified creators only
3. **Protects user accounts** - can recover via email
4. **Reduces fraud** - verified emails for financial actions
5. **Better deliverability** - verified emails for notifications

## 🚀 Benefits of Optional Verification

1. **Higher signup conversion** - No friction at signup (60-80% improvement)
2. **Better user experience** - Immediate value, verify when needed
3. **Reduced abandonment** - Users don't leave during signup
4. **Increased engagement** - Users try the product before committing
5. **Smart security** - Protection where it matters most

## 💡 Pro Tips

1. **Make it clear** - Explain WHY verification is needed
2. **Make it easy** - One-click send from the prompt
3. **Don't nag** - Only show prompt when action requires it
4. **Persist intent** - After verification, auto-complete the action
5. **Track metrics** - Monitor verification rates by action type

## 🛠️ Advanced: Auto-complete After Verification

Store the user's intended action and complete it after verification:

```typescript
const [pendingAction, setPendingAction] = useState<() => void>();

const handlePurchase = async (contentId: string) => {
  const status = await checkEmailVerification();

  if (status.needsVerification) {
    // Store the action to complete after verification
    setPendingAction(() => () => processPurchase(contentId));
    setShowVerifyPrompt(true);
    return;
  }

  await processPurchase(contentId);
};

// Listen for verification success
useEffect(() => {
  const checkVerificationStatus = async () => {
    const status = await checkEmailVerification();
    if (status.isVerified && pendingAction) {
      // Complete the pending action
      pendingAction();
      setPendingAction(undefined);
    }
  };

  // Poll for verification (or use Supabase realtime)
  const interval = setInterval(checkVerificationStatus, 2000);
  return () => clearInterval(interval);
}, [pendingAction]);
```

## 📊 Recommended Implementation Priority

1. **Phase 1: Critical Actions**
   - Purchases
   - Becoming a creator
   - Withdrawals

2. **Phase 2: Financial Actions**
   - Tips
   - Subscriptions
   - Payment methods

3. **Phase 3: Account Security**
   - Email changes
   - Account deletion
   - Data export

## 🎯 Summary

**Signup**: No verification needed ✅
**Browse**: No verification needed ✅
**Engage**: No verification needed ✅
**Purchase/Create/Withdraw**: Verification required 🔒

This approach maximizes signups while maintaining security where it matters!
