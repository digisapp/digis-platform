// Payoneer API Types

export type PayeeStatus = 'not_registered' | 'pending' | 'active' | 'inactive' | 'declined';

export type PaymentStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'rejected';

export interface PayoneerConfig {
  partnerId: string;
  apiUsername: string;
  apiPassword: string;
  apiUrl: string;
  programId: string;
  webhookSecret: string;
  mockMode: boolean;
}

// Registration Link Request/Response
export interface RegistrationLinkRequest {
  payeeId: string; // Our unique ID for the payee (creator ID)
  redirectUrl?: string;
  redirectTime?: number;
}

export interface RegistrationLinkResponse {
  registration_link: string;
  token?: string;
  payee_id: string;
  expires_at?: string;
}

// Payee Status Response
export interface PayeeStatusResponse {
  payee_id: string;
  status: string;
  contact?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  payout_methods?: Array<{
    type: string;
    currency: string;
    status: string;
  }>;
}

// Payment/Payout Types
export interface PayoutRequest {
  payee_id: string;
  amount: number;
  currency: string;
  description: string;
  client_reference_id: string; // Our payout request ID
  payout_method?: string;
}

export interface PayoutResponse {
  payment_id: string;
  payee_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  client_reference_id: string;
}

export interface PaymentStatusResponse {
  payment_id: string;
  status: PaymentStatus;
  payee_id: string;
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  failure_reason?: string;
}

// Webhook Event Types
export type WebhookEventType =
  | 'payee_status_changed'
  | 'payment_status_changed'
  | 'payout_completed'
  | 'payout_failed';

export interface WebhookEvent {
  event_type: WebhookEventType;
  timestamp: string;
  data: {
    payee_id?: string;
    payment_id?: string;
    status?: string;
    previous_status?: string;
    client_reference_id?: string;
    failure_reason?: string;
    amount?: number;
    currency?: string;
  };
}

// API Error Response
export interface PayoneerError {
  code: string;
  message: string;
  details?: string;
}

// Mock response generators for development
export interface MockPayoneerClient {
  generateMockRegistrationLink(payeeId: string): RegistrationLinkResponse;
  getMockPayeeStatus(payeeId: string): PayeeStatusResponse;
  submitMockPayout(request: PayoutRequest): PayoutResponse;
  getMockPaymentStatus(paymentId: string): PaymentStatusResponse;
}
