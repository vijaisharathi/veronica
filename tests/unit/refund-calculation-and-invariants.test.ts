import { describe, it, expect } from "vitest";
import {
  RefundCalculationService,
  REFUND_SHIPPING_POLICY,
} from "@/modules/refunds/calculations/refund-calculation.service";
import { RefundSourceType } from "@/constants/status";
import { IOrderPricingSnapshot, IOrderItemSnapshot, MinorUnits } from "@/types/database";

describe("RefundCalculationService — Financial Invariants & Calculations", () => {
  const calculationService = new RefundCalculationService();

  const standardPricing: IOrderPricingSnapshot = {
    subtotal: 500000, // ₹5,000
    discount: 50000, // ₹500
    couponDiscount: 0,
    shipping: 10000, // ₹100
    tax: 45000, // ₹450
    total: 505000, // ₹5,050
    currency: "INR",
  };

  const sampleItems: IOrderItemSnapshot[] = [
    {
      orderItemId: "item-1",
      productId: "prod-1",
      variantId: "var-1",
      sku: "SKU-SUIT-001",
      productName: "Tailored Wool Blazer",
      brandName: "VÉRONA",
      color: "Charcoal",
      size: "40R",
      image: "/suit.jpg",
      quantity: 1,
      unitPrice: 300000,
      discount: 30000,
      tax: 27000,
      finalPrice: 297000, // ₹2,970 paid
    },
    {
      orderItemId: "item-2",
      productId: "prod-2",
      variantId: "var-2",
      sku: "SKU-TROUSER-001",
      productName: "Pleated Trousers",
      brandName: "VÉRONA",
      color: "Charcoal",
      size: "32W",
      image: "/trouser.jpg",
      quantity: 2,
      unitPrice: 100000, // ₹1,000 each = 200000
      discount: 20000,
      tax: 18000,
      finalPrice: 198000, // ₹1,980 paid for 2 units (990 each)
    },
  ];

  describe("Section 90 — Core Refund Limit Tests", () => {
    it("Scenario 1: Order = ₹5,000, Previously refunded = ₹0, Request = ₹5,000 -> ₹5,000 allowed", () => {
      const result = calculationService.calculateRefund({
        orderPricing: { ...standardPricing, total: 500000, shipping: 0 },
        orderItems: [],
        paidAmountMinor: 500000,
        previouslyRefundedMinor: 0,
        customAdjustmentMinor: 500000,
        sourceType: RefundSourceType.ADMIN_ADJUSTMENT,
      });

      expect(result.finalRefundAmountMinor).toBe(500000);
      expect(result.refundableRemainingAfter).toBe(0);
      expect(result.isFullRefund).toBe(true);
    });

    it("Scenario 2: Order = ₹5,000, Previously refunded = ₹2,000, Request = ₹3,000 -> ₹3,000 allowed", () => {
      const result = calculationService.calculateRefund({
        orderPricing: { ...standardPricing, total: 500000, shipping: 0 },
        orderItems: [],
        paidAmountMinor: 500000,
        previouslyRefundedMinor: 200000,
        customAdjustmentMinor: 300000,
        sourceType: RefundSourceType.ADMIN_ADJUSTMENT,
      });

      expect(result.finalRefundAmountMinor).toBe(300000);
      expect(result.refundableRemainingAfter).toBe(0);
      expect(result.isFullRefund).toBe(true);
    });

    it("Scenario 3: Order = ₹5,000, Previously refunded = ₹2,000, Request = ₹4,000 -> rejected", () => {
      expect(() =>
        calculationService.calculateRefund({
          orderPricing: { ...standardPricing, total: 500000, shipping: 0 },
          orderItems: [],
          paidAmountMinor: 500000,
          previouslyRefundedMinor: 200000,
          customAdjustmentMinor: 400000, // exceeds remaining 300000
          sourceType: RefundSourceType.ADMIN_ADJUSTMENT,
        })
      ).toThrowError(/exceeds remaining refundable balance/i);
    });
  });

  describe("Section 91 — Cumulative Partial Refunds Test", () => {
    const captured: MinorUnits = 1000000; // ₹10,000

    it("Refund 1 (₹2,500), Refund 2 (₹3,500), Refund 3 (₹4,000) = ₹10,000 valid; additional ₹1 fails", () => {
      // Step 1: ₹2,500
      const r1 = calculationService.calculateRefund({
        orderPricing: { ...standardPricing, total: captured },
        orderItems: [],
        paidAmountMinor: captured,
        previouslyRefundedMinor: 0,
        customAdjustmentMinor: 250000,
        sourceType: RefundSourceType.ADMIN_ADJUSTMENT,
      });
      expect(r1.finalRefundAmountMinor).toBe(250000);
      expect(r1.refundableRemainingAfter).toBe(750000);

      // Step 2: ₹3,500
      const r2 = calculationService.calculateRefund({
        orderPricing: { ...standardPricing, total: captured },
        orderItems: [],
        paidAmountMinor: captured,
        previouslyRefundedMinor: 250000,
        customAdjustmentMinor: 350000,
        sourceType: RefundSourceType.ADMIN_ADJUSTMENT,
      });
      expect(r2.finalRefundAmountMinor).toBe(350000);
      expect(r2.refundableRemainingAfter).toBe(400000);

      // Step 3: ₹4,000 (Remaining ₹4,000 exactly)
      const r3 = calculationService.calculateRefund({
        orderPricing: { ...standardPricing, total: captured },
        orderItems: [],
        paidAmountMinor: captured,
        previouslyRefundedMinor: 600000, // 250000 + 350000
        customAdjustmentMinor: 400000,
        sourceType: RefundSourceType.ADMIN_ADJUSTMENT,
      });
      expect(r3.finalRefundAmountMinor).toBe(400000);
      expect(r3.refundableRemainingAfter).toBe(0);
      expect(r3.isFullRefund).toBe(true);

      // Step 4: Additional ₹1 (100 paise) must fail
      expect(() =>
        calculationService.calculateRefund({
          orderPricing: { ...standardPricing, total: captured },
          orderItems: [],
          paidAmountMinor: captured,
          previouslyRefundedMinor: 1000000,
          customAdjustmentMinor: 100,
          sourceType: RefundSourceType.ADMIN_ADJUSTMENT,
        })
      ).toThrowError(/No refundable balance remaining/i);
    });
  });

  describe("Item-Level Partial Return Calculations & Quantity Allocation", () => {
    it("refunds only proportional unit amount for 1 unit out of 2 of Item 2", () => {
      // Item 2: 2 units paid 198000 (990 each)
      const result = calculationService.calculateRefund({
        orderPricing: standardPricing,
        orderItems: sampleItems,
        paidAmountMinor: standardPricing.total,
        previouslyRefundedMinor: 0,
        itemsToRefund: [{ orderItemId: "item-2", quantity: 1 }],
        sourceType: RefundSourceType.RETURN,
        refundShipping: false, // Return after delivery excludes shipping
      });

      expect(result.finalRefundAmountMinor).toBe(99000); // exactly ₹990 paid for 1 unit
      expect(result.calculationSnapshot.items).toHaveLength(1);
      const firstItem = (result.calculationSnapshot.items || [])[0];
      expect(firstItem?.itemRefundAmount).toBe(99000);
      expect(firstItem?.discountAllocation).toBe(10000); // half of 20000
      expect(result.calculationSnapshot.shippingRefund).toBe(0);
    });

    it("rejects refund when requested item quantity exceeds ordered quantity", () => {
      expect(() =>
        calculationService.calculateRefund({
          orderPricing: standardPricing,
          orderItems: sampleItems,
          paidAmountMinor: standardPricing.total,
          previouslyRefundedMinor: 0,
          itemsToRefund: [{ orderItemId: "item-2", quantity: 5 }], // ordered only 2
          sourceType: RefundSourceType.RETURN,
        })
      ).toThrowError(/exceeds ordered quantity/i);
    });
  });

  describe("Shipping Refund Policy", () => {
    it("automatically includes shipping refund for ORDER_CANCELLATION", () => {
      const result = calculationService.calculateRefund({
        orderPricing: standardPricing, // shipping is 10000 (₹100)
        orderItems: sampleItems,
        paidAmountMinor: standardPricing.total,
        previouslyRefundedMinor: 0,
        sourceType: RefundSourceType.ORDER_CANCELLATION,
      });

      expect(result.calculationSnapshot.shippingRefund).toBe(standardPricing.shipping);
      expect(result.finalRefundAmountMinor).toBe(standardPricing.total);
    });

    it("excludes shipping refund for RETURN by default", () => {
      const result = calculationService.calculateRefund({
        orderPricing: standardPricing,
        orderItems: sampleItems,
        paidAmountMinor: standardPricing.total,
        previouslyRefundedMinor: 0,
        itemsToRefund: [{ orderItemId: "item-1", quantity: 1 }],
        sourceType: RefundSourceType.RETURN,
      });

      expect(result.calculationSnapshot.shippingRefund).toBe(0);
      expect(result.finalRefundAmountMinor).toBe(297000); // ₹2,970 (item only, no shipping)
    });
  });

  describe("Integer Money Invariants", () => {
    it("rejects non-integer minor unit amounts", () => {
      expect(() =>
        calculationService.calculateRefund({
          orderPricing: standardPricing,
          orderItems: [],
          paidAmountMinor: 500000,
          previouslyRefundedMinor: 0,
          customAdjustmentMinor: 100.5 as unknown as number, // invalid float
          sourceType: RefundSourceType.ADMIN_ADJUSTMENT,
        })
      ).toThrowError(/integer minor unit/i);
    });

    it("rejects negative refund requests", () => {
      expect(() =>
        calculationService.calculateRefund({
          orderPricing: standardPricing,
          orderItems: [],
          paidAmountMinor: 500000,
          previouslyRefundedMinor: 0,
          customAdjustmentMinor: -500,
          sourceType: RefundSourceType.ADMIN_ADJUSTMENT,
        })
      ).toThrowError(/greater than zero/i);
    });
  });
});
