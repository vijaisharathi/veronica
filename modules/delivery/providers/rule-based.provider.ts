/**
 * VÉRONA — Configured Rule-Based Delivery Serviceability Provider
 *
 * Implements deterministic serviceability checks using VÉRONA's configured
 * database rules (`ServiceabilityRuleModel`) with a curated baseline covering
 * Tier-1 & Tier-2 Indian metropolitan clusters.
 */

import { IDeliveryServiceabilityProvider } from "./delivery-provider.interface";
import {
  CheckServiceabilityParams,
  DeliveryServiceabilityResult,
  ServiceabilitySource,
  ServiceabilityState,
} from "../delivery.types";
import { ServiceabilityRuleModel } from "@/db/models";
import { IServiceabilityRule } from "@/types/database";

interface MetroZoneDefinition {
  prefixRange: [number, number];
  city: string;
  state: string;
  estimatedDeliveryDays: number;
}

// Major Indian metropolitan clusters for baseline serviceability
const METRO_ZONES: readonly MetroZoneDefinition[] = [
  { prefixRange: [110001, 110099], city: "New Delhi", state: "Delhi", estimatedDeliveryDays: 3 },
  { prefixRange: [400001, 400104], city: "Mumbai", state: "Maharashtra", estimatedDeliveryDays: 3 },
  { prefixRange: [560001, 560110], city: "Bengaluru", state: "Karnataka", estimatedDeliveryDays: 3 },
  { prefixRange: [600001, 600132], city: "Chennai", state: "Tamil Nadu", estimatedDeliveryDays: 3 },
  { prefixRange: [500001, 500099], city: "Hyderabad", state: "Telangana", estimatedDeliveryDays: 3 },
  { prefixRange: [700001, 700160], city: "Kolkata", state: "West Bengal", estimatedDeliveryDays: 4 },
  { prefixRange: [411001, 411062], city: "Pune", state: "Maharashtra", estimatedDeliveryDays: 3 },
  { prefixRange: [380001, 380063], city: "Ahmedabad", state: "Gujarat", estimatedDeliveryDays: 4 },
  { prefixRange: [302001, 302039], city: "Jaipur", state: "Rajasthan", estimatedDeliveryDays: 4 },
  { prefixRange: [682001, 682042], city: "Kochi", state: "Kerala", estimatedDeliveryDays: 4 },
  { prefixRange: [160001, 160071], city: "Chandigarh", state: "Chandigarh", estimatedDeliveryDays: 4 },
  { prefixRange: [226001, 226030], city: "Lucknow", state: "Uttar Pradesh", estimatedDeliveryDays: 4 },
];

export class RuleBasedServiceabilityProvider implements IDeliveryServiceabilityProvider {
  public readonly providerName = "RuleBasedServiceabilityProvider";

  async checkServiceability(params: CheckServiceabilityParams): Promise<DeliveryServiceabilityResult> {
    const postalCode = params.postalCode.trim();
    const country = (params.country || "IN").toUpperCase();
    const now = new Date().toISOString();

    // 1. Check database rules for explicit pin code configuration
    const dbRule = await ServiceabilityRuleModel.findOne({
      postalCode,
      country,
      status: "ACTIVE",
    }).lean<IServiceabilityRule>();

    if (dbRule) {
      if (dbRule.serviceable) {
        return {
          serviceable: true,
          state: ServiceabilityState.SERVICEABLE,
          postalCode,
          country,
          city: dbRule.city,
          stateName: dbRule.state,
          estimatedDeliveryDays: dbRule.estimatedDeliveryDays || 4,
          source: ServiceabilitySource.CONFIGURED_RULES,
          checkedAt: now,
        };
      } else {
        return {
          serviceable: false,
          state: ServiceabilityState.NOT_SERVICEABLE,
          postalCode,
          country,
          city: dbRule.city,
          stateName: dbRule.state,
          reason: dbRule.reason || "Delivery is currently unavailable to this PIN code",
          source: ServiceabilitySource.CONFIGURED_RULES,
          checkedAt: now,
        };
      }
    }

    // 2. If no explicit rule in database, evaluate baseline metro coverage
    const numericPincode = parseInt(postalCode, 10);
    const matchedMetro = METRO_ZONES.find(
      (zone) => numericPincode >= zone.prefixRange[0] && numericPincode <= zone.prefixRange[1]
    );

    if (matchedMetro) {
      return {
        serviceable: true,
        state: ServiceabilityState.SERVICEABLE,
        postalCode,
        country,
        city: matchedMetro.city,
        stateName: matchedMetro.state,
        estimatedDeliveryDays: matchedMetro.estimatedDeliveryDays,
        source: ServiceabilitySource.CONFIGURED_RULES,
        checkedAt: now,
      };
    }

    // 3. Fallback: Not serviceable under current network configuration
    return {
      serviceable: false,
      state: ServiceabilityState.NOT_SERVICEABLE,
      postalCode,
      country,
      reason: "Delivery is currently unavailable to this PIN code",
      source: ServiceabilitySource.CONFIGURED_RULES,
      checkedAt: now,
    };
  }
}

export const ruleBasedServiceabilityProvider = new RuleBasedServiceabilityProvider();
