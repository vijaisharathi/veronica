/**
 * VÉRONA — Shipping Provider Registry & Resolution Service (Phase 21)
 *
 * Manages registered shipping provider adapters and resolves the active provider
 * based on system configuration.
 */

import { IShippingProvider, ManualShippingProvider } from "../providers/shipping-provider";
import { logger } from "@/lib/logger";

export class ShippingProviderService {
  private providers = new Map<string, IShippingProvider>();

  constructor() {
    // Register the built-in manual provider
    this.registerProvider(new ManualShippingProvider());
  }

  /**
   * Register a shipping provider adapter.
   */
  registerProvider(provider: IShippingProvider): void {
    this.providers.set(provider.name.toUpperCase(), provider);
  }

  /**
   * Resolve a specific provider adapter by name.
   */
  getProvider(name: string): IShippingProvider | undefined {
    return this.providers.get(name.toUpperCase());
  }

  /**
   * Resolve the active default provider from environment variable.
   * Defaults to MANUAL if unset or unrecognized.
   */
  getActiveProvider(): IShippingProvider {
    const configured = (process.env.SHIPPING_PROVIDER || "MANUAL").toUpperCase();
    const provider = this.providers.get(configured);

    if (!provider) {
      logger.warn(`Configured shipping provider "${configured}" not found. Falling back to MANUAL.`);
      return this.providers.get("MANUAL")!;
    }

    return provider;
  }

  /**
   * Verify signature for incoming webhook from a given provider.
   */
  verifyWebhookSignature(providerName: string, payload: string | Buffer, signature: string): boolean {
    const provider = this.getProvider(providerName);
    if (!provider) {
      logger.warn(`Webhook received for unregistered provider: ${providerName}`);
      return false;
    }

    return provider.verifyWebhookSignature(payload, signature);
  }

  /**
   * List all registered providers and their capabilities.
   */
  getAvailableProviders(): { name: string; capabilities: Record<string, boolean> }[] {
    return Array.from(this.providers.values()).map((p) => ({
      name: p.name,
      capabilities: { ...p.capabilities },
    }));
  }
}

export const shippingProviderService = new ShippingProviderService();
