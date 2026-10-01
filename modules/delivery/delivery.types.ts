/**
 * VÉRONA — Delivery & Serviceability Domain Types & Contracts
 */

export const ServiceabilityState = {
  UNKNOWN: "UNKNOWN",
  CHECKING: "CHECKING",
  SERVICEABLE: "SERVICEABLE",
  NOT_SERVICEABLE: "NOT_SERVICEABLE",
  INVALID_PINCODE: "INVALID_PINCODE",
  SERVICEABILITY_UNAVAILABLE: "SERVICEABILITY_UNAVAILABLE",
} as const;

export type ServiceabilityState = (typeof ServiceabilityState)[keyof typeof ServiceabilityState];

export const ServiceabilitySource = {
  CONFIGURED_RULES: "CONFIGURED_RULES",
  PROVIDER_API: "PROVIDER_API",
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type ServiceabilitySource = (typeof ServiceabilitySource)[keyof typeof ServiceabilitySource];

/**
 * Authoritative VÉRONA Delivery Serviceability Result DTO
 */
export interface DeliveryServiceabilityResult {
  serviceable: boolean;
  state: ServiceabilityState;
  postalCode: string;
  country: string;
  city?: string;
  stateName?: string;
  estimatedDeliveryDays?: number;
  reason?: string;
  source: ServiceabilitySource;
  checkedAt: string;
}

export interface CheckServiceabilityParams {
  postalCode: string;
  country?: string;
  cart?: unknown;
}

export interface ServiceabilityRuleDTO {
  id: string;
  postalCode: string;
  country: string;
  serviceable: boolean;
  status: "ACTIVE" | "INACTIVE";
  city?: string;
  state?: string;
  estimatedDeliveryDays?: number;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceabilityRuleInput {
  postalCode: string;
  country?: string;
  serviceable: boolean;
  status?: "ACTIVE" | "INACTIVE";
  city?: string;
  state?: string;
  estimatedDeliveryDays?: number;
  reason?: string;
}

export interface UpdateServiceabilityRuleInput {
  serviceable?: boolean;
  status?: "ACTIVE" | "INACTIVE";
  city?: string;
  state?: string;
  estimatedDeliveryDays?: number;
  reason?: string;
}
