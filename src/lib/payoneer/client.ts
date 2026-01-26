/**
 * Payoneer API Client
 *
 * Handles HTTP communication with Payoneer API using Basic Auth.
 * Supports mock mode for development without real API credentials.
 */

import {
  PayoneerConfig,
  RegistrationLinkRequest,
  RegistrationLinkResponse,
  PayeeStatusResponse,
  PayoutRequest,
  PayoutResponse,
  PaymentStatusResponse,
  PayoneerError,
} from './types';

function getConfig(): PayoneerConfig {
  return {
    partnerId: process.env.PAYONEER_PARTNER_ID || '',
    apiUsername: process.env.PAYONEER_API_USERNAME || '',
    apiPassword: process.env.PAYONEER_API_PASSWORD || '',
    apiUrl: process.env.PAYONEER_API_URL || 'https://api.sandbox.payoneer.com/v4',
    programId: process.env.PAYONEER_PROGRAM_ID || '',
    webhookSecret: process.env.PAYONEER_WEBHOOK_SECRET || '',
    mockMode: process.env.PAYONEER_MOCK_MODE === 'true',
  };
}

function getBasicAuthHeader(config: PayoneerConfig): string {
  const credentials = Buffer.from(`${config.apiUsername}:${config.apiPassword}`).toString('base64');
  return `Basic ${credentials}`;
}

// Mock data store for development
const mockPayeeData: Map<string, { status: string; registeredAt?: Date }> = new Map();
const mockPaymentData: Map<string, { status: string; payeeId: string; amount: number; createdAt: Date }> = new Map();

// Mock implementations
function generateMockRegistrationLink(payeeId: string): RegistrationLinkResponse {
  // Store the payee as pending
  mockPayeeData.set(payeeId, { status: 'pending' });

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  return {
    registration_link: `https://sandbox.payoneer.com/register?payee=${payeeId}&mock=true`,
    token: `mock_token_${payeeId}_${Date.now()}`,
    payee_id: payeeId,
    expires_at: expiresAt.toISOString(),
  };
}

function getMockPayeeStatus(payeeId: string): PayeeStatusResponse {
  const data = mockPayeeData.get(payeeId);

  // Simulate auto-activation after registration (for testing)
  if (data?.status === 'pending' && data.registeredAt) {
    const timeSinceRegistration = Date.now() - data.registeredAt.getTime();
    // Auto-activate after 10 seconds in mock mode
    if (timeSinceRegistration > 10000) {
      mockPayeeData.set(payeeId, { ...data, status: 'active' });
      return {
        payee_id: payeeId,
        status: 'active',
        payout_methods: [{ type: 'bank_account', currency: 'USD', status: 'active' }],
      };
    }
  }

  return {
    payee_id: payeeId,
    status: data?.status || 'not_registered',
    payout_methods: data?.status === 'active'
      ? [{ type: 'bank_account', currency: 'USD', status: 'active' }]
      : undefined,
  };
}

function submitMockPayout(request: PayoutRequest): PayoutResponse {
  const paymentId = `mock_payment_${Date.now()}`;

  mockPaymentData.set(paymentId, {
    status: 'pending',
    payeeId: request.payee_id,
    amount: request.amount,
    createdAt: new Date(),
  });

  return {
    payment_id: paymentId,
    payee_id: request.payee_id,
    amount: request.amount,
    currency: request.currency,
    status: 'pending',
    created_at: new Date().toISOString(),
    client_reference_id: request.client_reference_id,
  };
}

function getMockPaymentStatus(paymentId: string): PaymentStatusResponse {
  const data = mockPaymentData.get(paymentId);

  if (!data) {
    throw new Error('Payment not found');
  }

  // Simulate payment completion after 5 seconds in mock mode
  const timeSinceCreation = Date.now() - data.createdAt.getTime();
  if (timeSinceCreation > 5000 && data.status === 'pending') {
    mockPaymentData.set(paymentId, { ...data, status: 'completed' });
    return {
      payment_id: paymentId,
      status: 'completed',
      payee_id: data.payeeId,
      amount: data.amount,
      currency: 'USD',
      created_at: data.createdAt.toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return {
    payment_id: paymentId,
    status: data.status as any,
    payee_id: data.payeeId,
    amount: data.amount,
    currency: 'USD',
    created_at: data.createdAt.toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Helper to simulate completing mock registration (for testing webhooks)
export function completeMockRegistration(payeeId: string): void {
  const data = mockPayeeData.get(payeeId);
  if (data) {
    mockPayeeData.set(payeeId, { ...data, status: 'active', registeredAt: new Date() });
  }
}

// Helper to simulate completing mock payment (for testing webhooks)
export function completeMockPayment(paymentId: string): void {
  const data = mockPaymentData.get(paymentId);
  if (data) {
    mockPaymentData.set(paymentId, { ...data, status: 'completed' });
  }
}

class PayoneerClient {
  private config: PayoneerConfig;

  constructor() {
    this.config = getConfig();
  }

  private isMockMode(): boolean {
    // SECURITY: Never allow mock mode in production, even if env var is set
    if (process.env.NODE_ENV === 'production' && this.config.mockMode) {
      console.error('[Payoneer] CRITICAL: PAYONEER_MOCK_MODE=true in production - ignoring');
      return false;
    }
    return this.config.mockMode;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.apiUrl}/programs/${this.config.programId}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': getBasicAuthHeader(this.config),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as PayoneerError;
      throw new Error(
        errorData.message || `Payoneer API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Generate a registration link for a creator to complete Payoneer signup
   */
  async generateRegistrationLink(request: RegistrationLinkRequest): Promise<RegistrationLinkResponse> {
    if (this.isMockMode()) {
      return generateMockRegistrationLink(request.payeeId);
    }

    return this.request<RegistrationLinkResponse>(
      'POST',
      `/payees/${request.payeeId}/registration-link`,
      {
        redirect_url: request.redirectUrl,
        redirect_time: request.redirectTime,
      }
    );
  }

  /**
   * Get the current status of a payee (creator)
   */
  async getPayeeStatus(payeeId: string): Promise<PayeeStatusResponse> {
    if (this.isMockMode()) {
      return getMockPayeeStatus(payeeId);
    }

    return this.request<PayeeStatusResponse>('GET', `/payees/${payeeId}`);
  }

  /**
   * Submit a payout to a payee
   */
  async submitPayout(request: PayoutRequest): Promise<PayoutResponse> {
    if (this.isMockMode()) {
      return submitMockPayout(request);
    }

    return this.request<PayoutResponse>('POST', '/payments', request);
  }

  /**
   * Get the status of a payment
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    if (this.isMockMode()) {
      return getMockPaymentStatus(paymentId);
    }

    return this.request<PaymentStatusResponse>('GET', `/payments/${paymentId}`);
  }

  /**
   * Verify webhook signature
   * SECURITY: Mock mode only works in development environment
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (this.isMockMode()) {
      // SECURITY: Only allow mock mode in development
      if (process.env.NODE_ENV === 'production') {
        console.error('[Payoneer] CRITICAL: Mock mode enabled in production - rejecting webhook');
        return false;
      }
      // In mock mode (development only), accept the webhook secret or a specific test signature
      return signature === this.config.webhookSecret || signature === 'mock_webhook_test';
    }

    if (!this.config.webhookSecret) {
      console.error('[Payoneer] Webhook secret not configured');
      return false;
    }

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      // timingSafeEqual throws if lengths differ
      return false;
    }
  }

  /**
   * Check if Payoneer is properly configured
   */
  isConfigured(): boolean {
    if (this.isMockMode()) return true;

    return Boolean(
      this.config.partnerId &&
      this.config.apiUsername &&
      this.config.apiPassword &&
      this.config.programId
    );
  }

  /**
   * Check if in mock mode
   */
  isMock(): boolean {
    return this.isMockMode();
  }
}

// Export singleton instance
export const payoneerClient = new PayoneerClient();
