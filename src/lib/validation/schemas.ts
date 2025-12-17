import { z } from 'zod';

// ============================================
// Common/Reusable Schemas
// ============================================

export const uuidSchema = z.string().uuid('Invalid ID format');

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email too long');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long');

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be 30 characters or less')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

export const displayNameSchema = z
  .string()
  .min(1, 'Display name is required')
  .max(50, 'Display name too long')
  .optional();

// ============================================
// Auth Schemas
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
});

export const checkUsernameSchema = z.object({
  username: usernameSchema,
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

// ============================================
// Financial Schemas (Wallet, Tips, Gifts)
// ============================================

// Coin amounts must be positive integers
export const coinAmountSchema = z
  .number()
  .int('Amount must be a whole number')
  .positive('Amount must be positive')
  .max(1_000_000, 'Amount too large'); // Reasonable upper limit

export const tipSchema = z.object({
  recipientId: uuidSchema,
  amount: coinAmountSchema,
  streamId: uuidSchema.optional(),
  note: z.string().max(500, 'Note too long').optional(),
});

export const giftSchema = z.object({
  recipientId: uuidSchema,
  giftId: uuidSchema,
  quantity: z.number().int().positive().max(100, 'Quantity too large').default(1),
  streamId: uuidSchema.optional(),
});

export const purchaseCoinsSchema = z.object({
  packageId: z.string().min(1, 'Package ID is required'),
  paymentMethodId: z.string().optional(),
});

export const payoutRequestSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(100_000, 'Amount too large'),
});

// ============================================
// Message Schemas
// ============================================

export const sendMessageSchema = z.object({
  recipientId: uuidSchema,
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long'),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(['image', 'video', 'audio']).optional(),
});

export const broadcastMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long'),
  recipientIds: z
    .array(uuidSchema)
    .min(1, 'At least one recipient required')
    .max(1000, 'Too many recipients'),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(['image', 'video', 'audio']).optional(),
});

// ============================================
// Stream Schemas
// ============================================

export const streamChatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message too long'),
  streamId: uuidSchema,
});

// ============================================
// Call Schemas
// ============================================

export const requestCallSchema = z.object({
  creatorId: uuidSchema,
  duration: z
    .number()
    .int()
    .positive()
    .max(120, 'Maximum call duration is 120 minutes'),
});

export const endCallSchema = z.object({
  callId: uuidSchema,
  reason: z.enum(['completed', 'cancelled', 'declined', 'timeout', 'error']).optional(),
});

// ============================================
// Banking/Payout Schemas
// ============================================

export const bankingInfoSchema = z.object({
  accountHolderName: z
    .string()
    .min(2, 'Account holder name is required')
    .max(100, 'Name too long'),
  accountType: z.enum(['checking', 'savings'], {
    message: 'Invalid account type',
  }),
  routingNumber: z
    .string()
    .regex(/^\d{9}$/, 'Routing number must be 9 digits'),
  accountNumber: z
    .string()
    .regex(/^\d{4,17}$/, 'Account number must be 4-17 digits'),
  bankName: z.string().max(100).optional(),
});

// ============================================
// Follow Schema
// ============================================

export const followUserSchema = z.object({
  userId: uuidSchema,
});

// ============================================
// Stream Creation Schema
// ============================================

export const createStreamSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be 100 characters or less'),
  description: z.string().max(500, 'Description too long').optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  privacy: z.enum(['public', 'private', 'subscribers', 'ticketed']).default('public'),
  thumbnail_url: z.string().url().optional().nullable(),
  scheduled_at: z.string().datetime().optional().nullable(),
  orientation: z.enum(['landscape', 'portrait']).default('landscape'),
  featuredCreatorCommission: z.number().min(0).max(100).optional(),
  ticketPrice: z.number().int().min(0).max(100000).optional(),
  goPrivateEnabled: z.boolean().optional(),
  goPrivateRate: z.number().int().min(0).max(10000).optional(),
  goPrivateMinDuration: z.number().int().min(1).max(120).optional(),
});

// ============================================
// Call Request Schema
// ============================================

export const callRequestSchema = z.object({
  creatorId: uuidSchema,
  callType: z.enum(['video', 'voice']).default('video'),
});

// ============================================
// Helper function to validate request body
// ============================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      // Get the first error message (Zod v4 uses 'issues' instead of 'errors')
      const firstError = result.error.issues[0];
      const errorMessage = firstError.path.length > 0
        ? `${firstError.path.join('.')}: ${firstError.message}`
        : firstError.message;

      return { success: false, error: errorMessage };
    }

    return { success: true, data: result.data };
  } catch {
    return { success: false, error: 'Invalid JSON body' };
  }
}
