/**
 * VÉRONA — Checkout Domain Orchestration Service
 *
 * Central authoritative orchestration service for Phase 17 Checkout.
 * Coordinates Cart, Live Pricing, Address selection, Delivery Serviceability,
 * and Coupon revalidation.
 *
 * Guarantees:
 * - Single source of truth: all pricing flows exclusively through PricingService
 * - Client zero-trust: no client-submitted totals or customer IDs accepted
 * - Anti-IDOR: strict session-derived customer ownership
 * - Multi-tab & refresh resilience with persistent, 30-minute TTL sessions
 * - Clean locked PaymentReadyCheckout handoff contract for Phase 18
 */

import { CheckoutRepository, checkoutRepository } from "./checkout.repository";
import {
  CheckoutDTO,
  CheckoutItemDTO,
  CheckoutPricingSummaryDTO,
  CheckoutAddressSnapshot,
  CheckoutServiceabilitySnapshot,
  CheckoutIssue,
  CheckoutIssueCode,
  PaymentReadyCheckout,
} from "./checkout.types";
import { CheckoutSessionStatus } from "@/constants/status";
import { cartService } from "@/modules/cart/cart.service";
import { pricingService } from "@/modules/pricing/pricing.service";
import { couponService } from "@/modules/pricing/coupon.service";
import { addressService } from "@/modules/addresses";
import { deliveryServiceabilityService } from "@/modules/delivery";
import { ServiceabilityState } from "@/modules/delivery/delivery.types";
import { minorToMajor } from "@/lib/money";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  AppError,
} from "@/lib/errors";
import { ICheckoutSession } from "@/types/database";
import { logger } from "@/lib/logger";

// 30 minutes session TTL
const CHECKOUT_TTL_MS = 30 * 60 * 1000;

export class CheckoutService {
  constructor(private readonly repo: CheckoutRepository = checkoutRepository) {}

  /**
   * Initializes or recovers an active checkout session for the authenticated customer.
   */
  async initializeCheckout(customerId: string, addressId?: string): Promise<CheckoutDTO> {
    if (!customerId) {
      throw new ValidationError("Customer identification required");
    }

    // 1. Load active cart
    const cart = await cartService.getCart({ customerId });
    if (!cart || cart.items.length === 0) {
      throw new AppError(
        "Your shopping bag is empty. Please add items to your bag before proceeding to checkout.",
        CheckoutIssueCode.CART_EMPTY,
        400
      );
    }

    // 2. Check for an existing active checkout session or create new
    let session = await this.repo.findActiveByCustomer(customerId);

    // 3. Resolve delivery address: if addressId provided use it, else keep session or auto-select default
    let selectedAddressId = session?.selectedAddressId?.toString();
    let addressSnapshot = session?.addressSnapshot;

    if (addressId) {
      const explicitAddress = await addressService.getAddress(customerId, addressId);
      selectedAddressId = explicitAddress.id;
      addressSnapshot = {
        addressId: explicitAddress.id,
        fullName: explicitAddress.fullName,
        phone: explicitAddress.phone,
        addressLine1: explicitAddress.addressLine1,
        addressLine2: explicitAddress.addressLine2,
        landmark: explicitAddress.landmark,
        city: explicitAddress.city,
        state: explicitAddress.state,
        postalCode: explicitAddress.postalCode,
        country: explicitAddress.country,
      };
    } else if (!selectedAddressId) {
      const addresses = await addressService.listAddresses(customerId);
      const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
      if (defaultAddress) {
        selectedAddressId = defaultAddress.id;
        addressSnapshot = {
          addressId: defaultAddress.id,
          fullName: defaultAddress.fullName,
          phone: defaultAddress.phone,
          addressLine1: defaultAddress.addressLine1,
          addressLine2: defaultAddress.addressLine2,
          landmark: defaultAddress.landmark,
          city: defaultAddress.city,
          state: defaultAddress.state,
          postalCode: defaultAddress.postalCode,
          country: defaultAddress.country,
        };
      }
    }

    // 4. Evaluate serviceability for selected address
    let serviceabilitySnapshot: CheckoutServiceabilitySnapshot | null = null;
    if (addressSnapshot?.postalCode) {
      const serviceabilityResult = await deliveryServiceabilityService.checkServiceability({
        postalCode: addressSnapshot.postalCode,
        country: addressSnapshot.country || "IN",
      });

      serviceabilitySnapshot = {
        postalCode: serviceabilityResult.postalCode,
        serviceable: serviceabilityResult.serviceable,
        state: serviceabilityResult.state,
        city: serviceabilityResult.city,
        stateName: serviceabilityResult.stateName,
        estimatedDeliveryDays: serviceabilityResult.estimatedDeliveryDays,
        reason: serviceabilityResult.reason,
        source: serviceabilityResult.source,
        checkedAt: serviceabilityResult.checkedAt,
      };
    }

    // 5. Authoritative live pricing recalculation
    const pricingItems = cart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
    }));

    const pricingBreakdown = await pricingService.calculateCartPricing({
      items: pricingItems,
      couponCode: cart.couponCode || undefined,
      customerId,
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CHECKOUT_TTL_MS);

    const pricingVersion = `v_${Date.now()}`;
    const pricingSnapshot = {
      subtotalMinor: pricingBreakdown.subtotalMinor,
      promotionDiscountMinor: pricingBreakdown.promotionDiscountMinor,
      couponDiscountMinor: pricingBreakdown.couponDiscountMinor,
      totalDiscountMinor: pricingBreakdown.totalDiscountMinor,
      amountDueBeforePaymentMinor: pricingBreakdown.grandTotalMinor,
      currency: "INR",
      pricingVersion,
      calculatedAt: now.toISOString(),
    };

    if (session) {
      // Refresh existing session
      session = await this.repo.update(session._id.toString(), customerId, {
        selectedAddressId: selectedAddressId as any,
        addressSnapshot: addressSnapshot as any,
        serviceabilitySnapshot: serviceabilitySnapshot as any,
        pricingSnapshot,
        appliedCouponCode: cart.couponCode || undefined,
        expiresAt,
      });
    } else {
      // Create new session & expire older sessions
      await this.repo.expireOtherActiveSessions(customerId);
      session = await this.repo.create({
        customerId: customerId as any,
        cartId: cart.id as any,
        selectedAddressId: selectedAddressId as any,
        status: CheckoutSessionStatus.ACTIVE,
        addressSnapshot: addressSnapshot as any,
        serviceabilitySnapshot: serviceabilitySnapshot as any,
        pricingSnapshot,
        appliedCouponCode: cart.couponCode || undefined,
        expiresAt,
      });
    }

    logger.info("Initialized checkout session", {
      context: "CheckoutService",
      metadata: { customerId, checkoutSessionId: session!._id.toString() },
    });

    return this.buildCheckoutDTO(session!, cart, pricingBreakdown, addressSnapshot, serviceabilitySnapshot);
  }

  /**
   * Retrieves current active checkout session for customer if one exists.
   */
  async getActiveCheckout(customerId: string): Promise<CheckoutDTO | null> {
    if (!customerId) return null;
    const session = await this.repo.findActiveByCustomer(customerId);
    if (!session) return null;
    return this.getCheckout(customerId, session._id.toString());
  }

  /**
   * Retrieves an active checkout session verifying customer ownership.
   */
  async getCheckout(customerId: string, sessionId: string): Promise<CheckoutDTO> {
    const session = await this.repo.findById(sessionId);
    if (!session) {
      throw new NotFoundError("CheckoutSession", sessionId);
    }

    if (session.customerId.toString() !== customerId) {
      throw new AuthorizationError("Access denied: You do not own this checkout session", "CHECKOUT_NOT_OWNED");
    }

    // Check expiration
    if (new Date() > new Date(session.expiresAt) || session.status === CheckoutSessionStatus.EXPIRED) {
      await this.repo.update(sessionId, customerId, { status: CheckoutSessionStatus.EXPIRED });
      const expiredSession = { ...session, status: CheckoutSessionStatus.EXPIRED };
      const cart = await cartService.getCart({ customerId });
      return this.buildCheckoutDTO(
        expiredSession,
        cart,
        undefined,
        session.addressSnapshot,
        session.serviceabilitySnapshot as CheckoutServiceabilitySnapshot | null | undefined
      );
    }

    // Re-verify live cart and pricing
    const cart = await cartService.getCart({ customerId });
    const pricingItems = cart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
    }));

    const pricingBreakdown = await pricingService.calculateCartPricing({
      items: pricingItems,
      couponCode: cart.couponCode || undefined,
      customerId,
    });

    return this.buildCheckoutDTO(
      session,
      cart,
      pricingBreakdown,
      session.addressSnapshot,
      session.serviceabilitySnapshot as CheckoutServiceabilitySnapshot | null | undefined
    );
  }

  /**
   * Selects or switches the delivery destination address for the checkout session.
   */
  async selectAddress(
    customerId: string,
    sessionId: string,
    addressId: string
  ): Promise<CheckoutDTO> {
    const session = await this.repo.findById(sessionId);
    if (!session) {
      throw new NotFoundError("CheckoutSession", sessionId);
    }

    if (session.customerId.toString() !== customerId) {
      throw new AuthorizationError("Access denied: You do not own this checkout session", "CHECKOUT_NOT_OWNED");
    }

    // Load and verify address ownership
    const address = await addressService.getAddress(customerId, addressId);

    const addressSnapshot: CheckoutAddressSnapshot = {
      addressId: address.id,
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    };

    // Revalidate delivery serviceability for newly selected postal code
    const serviceabilityResult = await deliveryServiceabilityService.checkServiceability({
      postalCode: address.postalCode,
      country: address.country || "IN",
    });

    const serviceabilitySnapshot: CheckoutServiceabilitySnapshot = {
      postalCode: serviceabilityResult.postalCode,
      serviceable: serviceabilityResult.serviceable,
      state: serviceabilityResult.state,
      city: serviceabilityResult.city,
      stateName: serviceabilityResult.stateName,
      estimatedDeliveryDays: serviceabilityResult.estimatedDeliveryDays,
      reason: serviceabilityResult.reason,
      source: serviceabilityResult.source,
      checkedAt: serviceabilityResult.checkedAt,
    };

    const updatedSession = await this.repo.update(sessionId, customerId, {
      selectedAddressId: addressId as any,
      addressSnapshot: addressSnapshot as any,
      serviceabilitySnapshot: serviceabilitySnapshot as any,
    });

    const cart = await cartService.getCart({ customerId });
    const pricingItems = cart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
    }));

    const pricingBreakdown = await pricingService.calculateCartPricing({
      items: pricingItems,
      couponCode: cart.couponCode || undefined,
      customerId,
    });

    logger.info("Updated checkout delivery address", {
      context: "CheckoutService",
      metadata: { customerId, sessionId, addressId, serviceable: serviceabilityResult.serviceable },
    });

    return this.buildCheckoutDTO(
      updatedSession!,
      cart,
      pricingBreakdown,
      addressSnapshot,
      serviceabilitySnapshot
    );
  }

  /**
   * Executes exhaustive pre-payment checkout validation.
   */
  async validateCheckout(
    customerId: string,
    sessionId: string
  ): Promise<{ valid: boolean; checkout: CheckoutDTO; issues: CheckoutIssue[] }> {
    const checkout = await this.getCheckout(customerId, sessionId);
    const issues = [...checkout.issues];

    return {
      valid: issues.length === 0,
      checkout: {
        ...checkout,
        issues,
        isValid: issues.length === 0,
        canProceedToPayment: issues.length === 0,
      },
      issues,
    };
  }

  /**
   * Produces a locked, authoritative payment-ready contract for Phase 18.
   */
  async getPaymentReadyContract(
    customerId: string,
    sessionId: string
  ): Promise<PaymentReadyCheckout> {
    const validation = await this.validateCheckout(customerId, sessionId);

    if (!validation.valid) {
      throw new ValidationError(
        "Checkout validation failed. Please resolve all issues before proceeding to payment.",
        validation.issues
      );
    }

    const { checkout } = validation;

    return {
      checkoutSessionId: checkout.id,
      customerId: checkout.customerId,
      cartId: checkout.cartId,
      currency: checkout.pricing.currency,
      amountMinor: checkout.pricing.amountDueBeforePaymentMinor,
      pricingVersion: checkout.pricing.pricingVersion,
      addressSnapshot: checkout.addressSnapshot!,
      serviceabilitySnapshot: checkout.serviceability!,
      items: checkout.items,
      appliedCouponCode: checkout.appliedCoupon?.code || null,
    };
  }

  // -------------------------------------------------------------
  // INTERNAL DTO BUILDER & ISSUE COMPILATION
  // -------------------------------------------------------------

  private buildCheckoutDTO(
    session: ICheckoutSession,
    cart: any,
    pricingBreakdown?: any,
    addressSnapshot?: CheckoutAddressSnapshot,
    serviceabilitySnapshot?: CheckoutServiceabilitySnapshot | null
  ): CheckoutDTO {
    const issues: CheckoutIssue[] = [];

    // 1. Session expiration issue
    const isExpired =
      session.status === CheckoutSessionStatus.EXPIRED ||
      new Date() > new Date(session.expiresAt);

    if (isExpired) {
      issues.push({
        code: CheckoutIssueCode.CHECKOUT_EXPIRED,
        message: "Your checkout session has expired. Please refresh to continue.",
        recoverable: true,
      });
    }

    // 2. Cart empty issue
    if (!cart || !cart.items || cart.items.length === 0) {
      issues.push({
        code: CheckoutIssueCode.CART_EMPTY,
        message: "Your shopping bag is empty.",
        recoverable: false,
      });
    }

    // 3. Address required & validation issue
    if (!addressSnapshot || !addressSnapshot.addressId) {
      issues.push({
        code: CheckoutIssueCode.ADDRESS_REQUIRED,
        message: "Please select or add a delivery address to proceed.",
        field: "selectedAddressId",
        recoverable: true,
      });
    }

    // 4. Delivery serviceability issues
    if (addressSnapshot && serviceabilitySnapshot) {
      if (!serviceabilitySnapshot.serviceable) {
        issues.push({
          code: CheckoutIssueCode.DELIVERY_NOT_SERVICEABLE,
          message:
            serviceabilitySnapshot.reason ||
            `Delivery is currently unavailable to PIN code ${serviceabilitySnapshot.postalCode}.`,
          field: "serviceability",
          recoverable: true,
        });
      } else if (
        serviceabilitySnapshot.state === ServiceabilityState.SERVICEABILITY_UNAVAILABLE
      ) {
        issues.push({
          code: CheckoutIssueCode.SERVICEABILITY_UNAVAILABLE,
          message: "Delivery serviceability is temporarily unavailable. Please try again.",
          field: "serviceability",
          recoverable: true,
        });
      }
    }

    // 5. Items availability & price change issues
    let hasPriceChanges = false;
    const checkoutItems: CheckoutItemDTO[] = (cart?.items || []).map((item: any) => {
      if (item.availability === "OUT_OF_STOCK") {
        issues.push({
          code: CheckoutIssueCode.PRODUCT_UNAVAILABLE,
          message: `${item.productName} (${item.selectedSize}) is currently out of stock.`,
          field: item.id,
          recoverable: true,
        });
      } else if (item.availability === "VARIANT_UNAVAILABLE") {
        issues.push({
          code: CheckoutIssueCode.VARIANT_UNAVAILABLE,
          message: `The selected variant of ${item.productName} is no longer available.`,
          field: item.id,
          recoverable: true,
        });
      }

      if (item.priceChanged) {
        hasPriceChanges = true;
      }

      return {
        itemId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        sku: item.sku,
        productName: item.productName,
        brandName: item.brand,
        size: item.selectedSize,
        colorName: item.selectedColor,
        colorHex: "#000000",
        image: item.image,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        unitPriceMajor: item.unitPriceMajor,
        unitMrpMinor: item.unitPriceMinor,
        unitMrpMajor: item.unitPriceMajor,
        lineSubtotalMinor: item.lineTotalMinor,
        lineSubtotalMajor: item.lineTotalMajor,
        lineDiscountMinor: 0,
        lineDiscountMajor: 0,
        lineTotalMinor: item.lineTotalMinor,
        lineTotalMajor: item.lineTotalMajor,
        priceChanged: Boolean(item.priceChanged),
        previousPriceMinor: item.previousPriceMinor,
        previousPriceMajor: item.previousPriceMajor,
      };
    });

    if (hasPriceChanges) {
      issues.push({
        code: CheckoutIssueCode.PRICE_CHANGED,
        message: "Prices for one or more garments in your bag have updated. Please review before proceeding.",
        recoverable: true,
      });
    }

    // 6. Pricing Summary Construction
    const subtotalMinor = pricingBreakdown
      ? pricingBreakdown.subtotalMinor
      : session.pricingSnapshot.subtotalMinor;
    const promotionDiscountMinor = pricingBreakdown
      ? pricingBreakdown.promotionDiscountMinor
      : session.pricingSnapshot.promotionDiscountMinor;
    const couponDiscountMinor = pricingBreakdown
      ? pricingBreakdown.couponDiscountMinor
      : session.pricingSnapshot.couponDiscountMinor;
    const totalDiscountMinor = pricingBreakdown
      ? pricingBreakdown.totalDiscountMinor
      : session.pricingSnapshot.totalDiscountMinor;
    const amountDueBeforePaymentMinor = pricingBreakdown
      ? pricingBreakdown.grandTotalMinor
      : session.pricingSnapshot.amountDueBeforePaymentMinor;

    const pricing: CheckoutPricingSummaryDTO = {
      subtotalMinor,
      subtotalMajor: minorToMajor(subtotalMinor),
      promotionDiscountMinor,
      promotionDiscountMajor: minorToMajor(promotionDiscountMinor),
      couponDiscountMinor,
      couponDiscountMajor: minorToMajor(couponDiscountMinor),
      totalDiscountMinor,
      totalDiscountMajor: minorToMajor(totalDiscountMinor),
      amountDueBeforePaymentMinor,
      amountDueBeforePaymentMajor: minorToMajor(amountDueBeforePaymentMinor),
      currency: "INR",
      pricingVersion: session.pricingSnapshot.pricingVersion,
      calculatedAt: session.pricingSnapshot.calculatedAt,
    };

    const isValid = issues.length === 0;
    const canProceedToPayment = isValid && !isExpired;

    return {
      id: session._id.toString(),
      customerId: session.customerId.toString(),
      cartId: session.cartId.toString(),
      status: session.status,
      selectedAddressId: addressSnapshot?.addressId,
      addressSnapshot,
      items: checkoutItems,
      pricing,
      appliedCoupon: pricingBreakdown?.appliedCoupon || null,
      serviceability: serviceabilitySnapshot,
      issues,
      isValid,
      canProceedToPayment,
      expiresAt: session.expiresAt instanceof Date ? session.expiresAt.toISOString() : String(session.expiresAt),
      createdAt: session.createdAt instanceof Date ? session.createdAt.toISOString() : String(session.createdAt),
      updatedAt: session.updatedAt instanceof Date ? session.updatedAt.toISOString() : String(session.updatedAt),
    };
  }
}

export const checkoutService = new CheckoutService();
