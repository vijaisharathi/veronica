/**
 * VÉRONA — Shipping Provider Interface (Phase 21)
 *
 * Abstract interface for shipping provider adapters.
 * All providers must implement this contract. No provider logic
 * should be scattered across fulfillment services.
 */

import {
  ShippingProviderCapabilities,
  CreateShipmentProviderRequest,
  CreateShipmentProviderResponse,
  TrackShipmentProviderResponse,
} from "../types/fulfillment.types";

export interface IShippingProvider {
  readonly name: string;
  readonly capabilities: ShippingProviderCapabilities;

  createShipment(request: CreateShipmentProviderRequest): Promise<CreateShipmentProviderResponse>;
  trackShipment(awbNumber: string): Promise<TrackShipmentProviderResponse>;
  cancelShipment(providerShipmentId: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Verifies the authenticity of a webhook payload using the provider's
   * documented signature mechanism. Returns true if valid.
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
}

/**
 * Manual/internal shipping provider for warehouse-managed deliveries
 * or development environments without a real provider.
 *
 * This provider does NOT fabricate AWBs, tracking URLs, or fake delivery events.
 * It records that shipment creation was requested and tracks state internally only.
 */
export class ManualShippingProvider implements IShippingProvider {
  readonly name = "MANUAL";
  readonly capabilities: ShippingProviderCapabilities = {
    createShipment: true,
    cancelShipment: true,
    trackShipment: false,
    generateLabel: false,
    registerPickup: false,
  };

  async createShipment(request: CreateShipmentProviderRequest): Promise<CreateShipmentProviderResponse> {
    return {
      success: true,
      providerShipmentId: `MANUAL-${request.shipmentNumber}`,
      awbNumber: undefined,
      trackingUrl: undefined,
      estimatedDeliveryDate: undefined,
    };
  }

  async trackShipment(_awbNumber: string): Promise<TrackShipmentProviderResponse> {
    return {
      success: false,
      error: "Tracking is not supported by the Manual shipping provider.",
    };
  }

  async cancelShipment(_providerShipmentId: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  verifyWebhookSignature(_payload: string | Buffer, _signature: string): boolean {
    return false;
  }
}
