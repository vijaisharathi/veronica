/**
 * VÉRONA — Payment Domain Types & Data Transfer Objects
 *
 * Strongly typed definitions for payment orchestration, provider adapters,
 * payment attempts, webhook event tracking, and Phase 19 order handoff.
 */

import { PaymentStatus } from "@/constants/status";
import { MinorUnits } from "@/types/database";

export interface CreatePaymentOrderParams {
  amountMinor: MinorUnits;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface ProviderOrderResult {
  providerOrderId: string;
  amountMinor: MinorUnits;
  currency: string;
  status: string;
  provider: string;
  createdAt: number;
}

export interface VerifyPaymentParams {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

export interface VerifyPaymentResult {
  verified: boolean;
  providerPaymentId: string;
  providerOrderId: string;
  reason?: string;
}

export interface VerifyWebhookParams {
  rawPayload: string;
  signature: string;
  secret?: string;
}

export interface VerifyWebhookResult {
  verified: boolean;
  event?: Record<string, unknown>;
  reason?: string;
}

export interface ProviderPaymentDetails {
  id: string;
  orderId?: string;
  amountMinor: MinorUnits;
  currency: string;
  status: string;
  method?: string;
  email?: string;
  contact?: string;
  errorDescription?: string;
  createdAt: number;
}

export interface ProviderOrderDetails {
  id: string;
  amountMinor: MinorUnits;
  amountPaidMinor: MinorUnits;
  currency: string;
  status: string;
  receipt?: string;
  createdAt: number;
}

export interface CreateRefundParams {
  providerPaymentId: string;
  amountMinor: MinorUnits;
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
  idempotencyKey?: string;
}

export interface ProviderRefundResult {
  providerRefundId: string;
  providerPaymentId: string;
  amountMinor: MinorUnits;
  currency: string;
  status: string;
  receipt?: string;
  createdAt?: number;
  rawResponse?: Record<string, unknown>;
}

export interface GetRefundResult {
  providerRefundId: string;
  providerPaymentId: string;
  amountMinor: MinorUnits;
  currency: string;
  status: string;
  receipt?: string;
  createdAt?: number;
  rawResponse?: Record<string, unknown>;
}

/**
 * Common Payment Provider Adapter Interface
 */
export interface IPaymentProvider {
  readonly providerName: string;
  getPublicKey(): string;
  createPaymentOrder(params: CreatePaymentOrderParams): Promise<ProviderOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;
  verifyWebhook(params: VerifyWebhookParams): Promise<VerifyWebhookResult>;
  fetchPayment(providerPaymentId: string): Promise<ProviderPaymentDetails>;
  fetchPaymentOrder(providerOrderId: string): Promise<ProviderOrderDetails>;
  createRefund?(params: CreateRefundParams): Promise<ProviderRefundResult>;
  getRefund?(providerRefundId: string): Promise<GetRefundResult>;
}

/**
 * Payment Initiation Input
 */
export interface CreatePaymentInput {
  checkoutSessionId: string;
  idempotencyKey?: string;
}

/**
 * Client-Safe Payment Initialization DTO
 */
export interface PaymentInitializationDTO {
  paymentId: string;
  provider: string;
  providerOrderId: string;
  amountMinor: MinorUnits;
  currency: string;
  publicKeyId: string;
  checkoutSessionId: string;
  customer: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

/**
 * Payment Verification Input (from client callback)
 */
export interface VerifyPaymentInput {
  paymentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/**
 * Verification Result DTO
 */
export interface PaymentVerificationDTO {
  paymentId: string;
  status: PaymentStatus;
  amountMinor: MinorUnits;
  currency: string;
  provider: string;
  providerPaymentId: string;
  checkoutSessionId: string;
  verifiedAt: string;
}

/**
 * Payment Attempt DTO
 */
export interface PaymentAttemptDTO {
  attemptId: string;
  providerOrderId: string;
  providerPaymentId?: string;
  amountMinor: MinorUnits;
  currency: string;
  status: PaymentStatus;
  failureCode?: string;
  failureMessage?: string;
  createdAt: string;
}

/**
 * Full Payment Status DTO
 */
export interface PaymentStatusDTO {
  id: string;
  checkoutSessionId: string;
  customerId: string;
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  amountMinor: MinorUnits;
  currency: string;
  status: PaymentStatus;
  method?: string;
  attempts: PaymentAttemptDTO[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Phase 19 Payment Result Handoff Contract
 */
export interface PaymentResult {
  paymentId: string;
  checkoutSessionId: string;
  customerId: string;
  status: PaymentStatus;
  amountMinor: MinorUnits;
  currency: string;
  provider: string;
  providerPaymentId?: string;
  providerOrderId?: string;
}
