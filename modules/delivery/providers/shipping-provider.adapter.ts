/**
 * VÉRONA — Shipping Provider Adapter
 *
 * Implements the delivery serviceability provider abstraction.
 * - Detects configured shipping logistics carrier credentials in runtime environment
 * - If no external courier is configured, seamlessly delegates to the configured rule-based provider
 * - If an external courier is configured but encounters failures or timeouts, catches them gracefully
 *   and returns SERVICEABILITY_UNAVAILABLE without crashing the application.
 */

import { IDeliveryServiceabilityProvider } from "./delivery-provider.interface";
import { ruleBasedServiceabilityProvider } from "./rule-based.provider";
import {
  CheckServiceabilityParams,
  DeliveryServiceabilityResult,
  ServiceabilitySource,
  ServiceabilityState,
} from "../delivery.types";
import { logger } from "@/lib/logger";

export class ShippingProviderAdapter implements IDeliveryServiceabilityProvider {
  public readonly providerName = "ShippingProviderAdapter";

  /**
   * Evaluates serviceability against configured external provider or rule-based fallback.
   */
  async checkServiceability(params: CheckServiceabilityParams): Promise<DeliveryServiceabilityResult> {
    const hasExternalCarrier = Boolean(
      process.env.SHIPROCKET_API_KEY || process.env.DELHIVERY_API_KEY
    );

    // If no carrier credentials configured in environment, use configured rules
    if (!hasExternalCarrier) {
      return ruleBasedServiceabilityProvider.checkServiceability(params);
    }

    try {
      // Future-ready hook for live courier aggregation API (Phase 16 boundary)
      // When external API keys are present, this adapter maps the raw courier response
      // to the stable VÉRONA DeliveryServiceabilityResult DTO.
      return await this.callExternalCourier(params);
    } catch (error) {
      logger.error("External delivery serviceability provider failure", {
        context: "ShippingProviderAdapter",
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        serviceable: false,
        state: ServiceabilityState.SERVICEABILITY_UNAVAILABLE,
        postalCode: params.postalCode,
        country: params.country || "IN",
        reason: "Delivery serviceability is temporarily unavailable. Please try again shortly.",
        source: ServiceabilitySource.UNAVAILABLE,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Internal method executing the external courier API call.
   */
  private async callExternalCourier(params: CheckServiceabilityParams): Promise<DeliveryServiceabilityResult> {
    // When live courier endpoints are configured, execute timeout-bounded fetch here.
    // For now, delegate to rule provider as authoritative fallback.
    return ruleBasedServiceabilityProvider.checkServiceability(params);
  }
}

export const shippingProviderAdapter = new ShippingProviderAdapter();
