/**
 * VÉRONA — Delivery Serviceability Provider Interface
 *
 * Pluggable abstraction decoupling storefront checkout from specific courier partners.
 */

import { CheckServiceabilityParams, DeliveryServiceabilityResult } from "../delivery.types";

export interface IDeliveryServiceabilityProvider {
  readonly providerName: string;

  checkServiceability(params: CheckServiceabilityParams): Promise<DeliveryServiceabilityResult>;
}
