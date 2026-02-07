/**
 * Zod Validation Schema Tests
 *
 * Tests all validation schemas used for API input validation.
 * Pure schema tests - no DB or network dependencies.
 */

import { describe, it, expect } from 'vitest';
import {
  uuidSchema,
  emailSchema,
  passwordSchema,
  usernameSchema,
  loginSchema,
  signupSchema,
  coinAmountSchema,
  tipSchema,
  giftSchema,
  sendMessageSchema,
  streamChatMessageSchema,
  requestCallSchema,
  bankingInfoSchema,
  createStreamSchema,
  streamTipSchema,
  payoutRequestSchema,
  createContentSchema,
} from '@/lib/validation/schemas';

// Helper to get the first Zod error message
const getError = (result: { success: boolean; error?: any }) => {
  if (result.success) return null;
  return result.error.issues[0]?.message;
};

describe('uuidSchema', () => {
  it('accepts valid UUIDs', () => {
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
    expect(uuidSchema.safeParse('00000000-0000-0000-0000-000000000000').success).toBe(true);
  });

  it('rejects invalid UUIDs', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(uuidSchema.safeParse('').success).toBe(false);
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716').success).toBe(false);
  });
});

describe('emailSchema', () => {
  it('accepts valid emails', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true);
    expect(emailSchema.safeParse('test.user+tag@domain.co.uk').success).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(emailSchema.safeParse('notanemail').success).toBe(false);
    expect(emailSchema.safeParse('@missing.local').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
  });

  it('rejects emails over 255 chars', () => {
    const longEmail = 'a'.repeat(250) + '@b.com';
    expect(emailSchema.safeParse(longEmail).success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('accepts valid passwords', () => {
    expect(passwordSchema.safeParse('password123').success).toBe(true);
    expect(passwordSchema.safeParse('12345678').success).toBe(true);
  });

  it('rejects passwords under 8 chars', () => {
    const result = passwordSchema.safeParse('short');
    expect(result.success).toBe(false);
  });

  it('rejects passwords over 128 chars', () => {
    const result = passwordSchema.safeParse('a'.repeat(129));
    expect(result.success).toBe(false);
  });
});

describe('usernameSchema', () => {
  it('accepts valid usernames', () => {
    expect(usernameSchema.safeParse('john_doe').success).toBe(true);
    expect(usernameSchema.safeParse('abc').success).toBe(true);
    expect(usernameSchema.safeParse('User123').success).toBe(true);
  });

  it('rejects usernames under 3 chars', () => {
    expect(usernameSchema.safeParse('ab').success).toBe(false);
  });

  it('rejects usernames over 30 chars', () => {
    expect(usernameSchema.safeParse('a'.repeat(31)).success).toBe(false);
  });

  it('rejects usernames with special characters', () => {
    expect(usernameSchema.safeParse('user@name').success).toBe(false);
    expect(usernameSchema.safeParse('user name').success).toBe(false);
    expect(usernameSchema.safeParse('user.name').success).toBe(false);
    expect(usernameSchema.safeParse('user-name').success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid login data', () => {
    const result = loginSchema.safeParse({ email: 'user@test.com', password: 'x' });
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    expect(loginSchema.safeParse({ password: 'test' }).success).toBe(false);
  });

  it('rejects empty password', () => {
    expect(loginSchema.safeParse({ email: 'user@test.com', password: '' }).success).toBe(false);
  });
});

describe('signupSchema', () => {
  it('accepts valid signup data', () => {
    const result = signupSchema.safeParse({
      email: 'user@test.com',
      password: 'password123',
      username: 'testuser',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weak password', () => {
    const result = signupSchema.safeParse({
      email: 'user@test.com',
      password: 'short',
      username: 'testuser',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid username', () => {
    const result = signupSchema.safeParse({
      email: 'user@test.com',
      password: 'password123',
      username: 'ab',
    });
    expect(result.success).toBe(false);
  });
});

describe('coinAmountSchema', () => {
  it('accepts positive integers', () => {
    expect(coinAmountSchema.safeParse(1).success).toBe(true);
    expect(coinAmountSchema.safeParse(100).success).toBe(true);
    expect(coinAmountSchema.safeParse(1_000_000).success).toBe(true);
  });

  it('rejects zero', () => {
    expect(coinAmountSchema.safeParse(0).success).toBe(false);
  });

  it('rejects negative numbers', () => {
    expect(coinAmountSchema.safeParse(-1).success).toBe(false);
  });

  it('rejects decimals', () => {
    expect(coinAmountSchema.safeParse(1.5).success).toBe(false);
  });

  it('rejects amounts over 1M', () => {
    expect(coinAmountSchema.safeParse(1_000_001).success).toBe(false);
  });
});

describe('tipSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts valid tip data', () => {
    const result = tipSchema.safeParse({ recipientId: validUuid, amount: 100 });
    expect(result.success).toBe(true);
  });

  it('accepts tip with optional note', () => {
    const result = tipSchema.safeParse({
      recipientId: validUuid,
      amount: 50,
      note: 'Great stream!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects note over 500 chars', () => {
    const result = tipSchema.safeParse({
      recipientId: validUuid,
      amount: 50,
      note: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid recipientId', () => {
    expect(tipSchema.safeParse({ recipientId: 'bad', amount: 100 }).success).toBe(false);
  });
});

describe('giftSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts valid gift data', () => {
    const result = giftSchema.safeParse({
      recipientId: validUuid,
      giftId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it('rejects quantity over 100', () => {
    const result = giftSchema.safeParse({
      recipientId: validUuid,
      giftId: validUuid,
      quantity: 101,
    });
    expect(result.success).toBe(false);
  });
});

describe('sendMessageSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts valid message', () => {
    const result = sendMessageSchema.safeParse({
      recipientId: validUuid,
      content: 'Hello!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty content', () => {
    expect(sendMessageSchema.safeParse({
      recipientId: validUuid,
      content: '',
    }).success).toBe(false);
  });

  it('rejects content over 2000 chars', () => {
    expect(sendMessageSchema.safeParse({
      recipientId: validUuid,
      content: 'x'.repeat(2001),
    }).success).toBe(false);
  });

  it('accepts optional media fields', () => {
    const result = sendMessageSchema.safeParse({
      recipientId: validUuid,
      content: 'Check this out',
      mediaUrl: 'https://example.com/image.jpg',
      mediaType: 'image',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid mediaType', () => {
    expect(sendMessageSchema.safeParse({
      recipientId: validUuid,
      content: 'test',
      mediaType: 'pdf',
    }).success).toBe(false);
  });
});

describe('streamChatMessageSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts valid chat message', () => {
    expect(streamChatMessageSchema.safeParse({
      message: 'Hello chat!',
      streamId: validUuid,
    }).success).toBe(true);
  });

  it('rejects message over 500 chars', () => {
    expect(streamChatMessageSchema.safeParse({
      message: 'x'.repeat(501),
      streamId: validUuid,
    }).success).toBe(false);
  });
});

describe('requestCallSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts valid call request', () => {
    expect(requestCallSchema.safeParse({
      creatorId: validUuid,
      duration: 30,
    }).success).toBe(true);
  });

  it('rejects duration over 120 minutes', () => {
    expect(requestCallSchema.safeParse({
      creatorId: validUuid,
      duration: 121,
    }).success).toBe(false);
  });

  it('rejects non-positive duration', () => {
    expect(requestCallSchema.safeParse({
      creatorId: validUuid,
      duration: 0,
    }).success).toBe(false);
  });
});

describe('bankingInfoSchema', () => {
  it('accepts valid banking info', () => {
    const result = bankingInfoSchema.safeParse({
      accountHolderName: 'John Doe',
      accountType: 'checking',
      routingNumber: '123456789',
      accountNumber: '1234567890',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid routing number (not 9 digits)', () => {
    expect(bankingInfoSchema.safeParse({
      accountHolderName: 'John Doe',
      accountType: 'checking',
      routingNumber: '12345',
      accountNumber: '1234567890',
    }).success).toBe(false);
  });

  it('rejects invalid account type', () => {
    expect(bankingInfoSchema.safeParse({
      accountHolderName: 'John Doe',
      accountType: 'investment',
      routingNumber: '123456789',
      accountNumber: '1234567890',
    }).success).toBe(false);
  });

  it('rejects short account number', () => {
    expect(bankingInfoSchema.safeParse({
      accountHolderName: 'John Doe',
      accountType: 'checking',
      routingNumber: '123456789',
      accountNumber: '123',
    }).success).toBe(false);
  });
});

describe('createStreamSchema', () => {
  it('accepts valid stream with defaults', () => {
    const result = createStreamSchema.safeParse({ title: 'My Stream' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.privacy).toBe('public');
      expect(result.data.orientation).toBe('landscape');
    }
  });

  it('rejects empty title', () => {
    expect(createStreamSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('rejects title over 100 chars', () => {
    expect(createStreamSchema.safeParse({ title: 'x'.repeat(101) }).success).toBe(false);
  });

  it('accepts all privacy options', () => {
    for (const privacy of ['public', 'private', 'subscribers', 'ticketed']) {
      expect(createStreamSchema.safeParse({ title: 'test', privacy }).success).toBe(true);
    }
  });

  it('rejects invalid privacy option', () => {
    expect(createStreamSchema.safeParse({ title: 'test', privacy: 'unlisted' }).success).toBe(false);
  });
});

describe('streamTipSchema', () => {
  it('accepts valid stream tip', () => {
    expect(streamTipSchema.safeParse({ amount: 100 }).success).toBe(true);
  });

  it('rejects amount below 1', () => {
    expect(streamTipSchema.safeParse({ amount: 0 }).success).toBe(false);
  });

  it('rejects amount over 100000', () => {
    expect(streamTipSchema.safeParse({ amount: 100001 }).success).toBe(false);
  });

  it('rejects decimal amounts', () => {
    expect(streamTipSchema.safeParse({ amount: 1.5 }).success).toBe(false);
  });

  it('accepts optional message', () => {
    expect(streamTipSchema.safeParse({
      amount: 50,
      message: 'Love the stream!',
    }).success).toBe(true);
  });
});

describe('payoutRequestSchema', () => {
  it('accepts valid payout request', () => {
    const result = payoutRequestSchema.safeParse({ amount: 100 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.method).toBe('bank_transfer');
    }
  });

  it('rejects amount over 100000', () => {
    expect(payoutRequestSchema.safeParse({ amount: 100001 }).success).toBe(false);
  });

  it('rejects non-positive amount', () => {
    expect(payoutRequestSchema.safeParse({ amount: 0 }).success).toBe(false);
    expect(payoutRequestSchema.safeParse({ amount: -10 }).success).toBe(false);
  });

  it('accepts payoneer method', () => {
    const result = payoutRequestSchema.safeParse({ amount: 100, method: 'payoneer' });
    expect(result.success).toBe(true);
  });
});

describe('createContentSchema', () => {
  it('accepts valid content', () => {
    const result = createContentSchema.safeParse({
      title: 'My Photo',
      contentType: 'photo',
      unlockPrice: 50,
      thumbnailUrl: 'https://example.com/thumb.jpg',
      mediaUrl: 'https://example.com/media.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative unlock price', () => {
    expect(createContentSchema.safeParse({
      title: 'My Photo',
      contentType: 'photo',
      unlockPrice: -1,
      thumbnailUrl: 'https://example.com/thumb.jpg',
      mediaUrl: 'https://example.com/media.jpg',
    }).success).toBe(false);
  });

  it('rejects invalid content type', () => {
    expect(createContentSchema.safeParse({
      title: 'My Photo',
      contentType: 'document',
      unlockPrice: 50,
      thumbnailUrl: 'https://example.com/thumb.jpg',
      mediaUrl: 'https://example.com/media.jpg',
    }).success).toBe(false);
  });
});
