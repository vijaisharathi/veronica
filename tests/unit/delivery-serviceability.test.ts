import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeliveryServiceabilityService } from "@/modules/delivery/delivery-serviceability.service";
import { ServiceabilityState, ServiceabilitySource } from "@/modules/delivery/delivery.types";
import { ServiceabilityRuleModel, AuditLogModel } from "@/db/models";

vi.mock("@/db/models", () => ({
  ServiceabilityRuleModel: {
    findOne: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    countDocuments: vi.fn(),
  },
  AuditLogModel: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

describe("Phase 16 — Delivery Serviceability Domain Service Unit Tests", () => {
  let service: DeliveryServiceabilityService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DeliveryServiceabilityService();
    service.clearCache();
  });

  describe("checkServiceability", () => {
    it("should return INVALID_PINCODE for malformed postal codes", async () => {
      const invalidCodes = ["123", "012345", "ABCDEF", "1234567", ""];

      for (const code of invalidCodes) {
        const result = await service.checkServiceability({ postalCode: code });
        expect(result.state).toBe(ServiceabilityState.INVALID_PINCODE);
        expect(result.serviceable).toBe(false);
      }
    });

    it("should return SERVICEABLE for baseline metro PIN codes (e.g. 600001 Chennai)", async () => {
      vi.mocked(ServiceabilityRuleModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const result = await service.checkServiceability({ postalCode: "600001" });

      expect(result.state).toBe(ServiceabilityState.SERVICEABLE);
      expect(result.serviceable).toBe(true);
      expect(result.city).toBe("Chennai");
      expect(result.stateName).toBe("Tamil Nadu");
      expect(result.source).toBe(ServiceabilitySource.CONFIGURED_RULES);
      expect(result.estimatedDeliveryDays).toBeGreaterThan(0);
    });

    it("should give precedence to explicit database rules over baseline", async () => {
      vi.mocked(ServiceabilityRuleModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "rule-1",
          postalCode: "600001",
          country: "IN",
          serviceable: false,
          status: "ACTIVE",
          city: "Chennai",
          state: "Tamil Nadu",
          reason: "Temporarily suspended due to local logistics maintenance",
        }),
      } as any);

      const result = await service.checkServiceability({ postalCode: "600001" });

      expect(result.state).toBe(ServiceabilityState.NOT_SERVICEABLE);
      expect(result.serviceable).toBe(false);
      expect(result.reason).toContain("Temporarily suspended");
    });

    it("should return NOT_SERVICEABLE for unmapped remote PIN code", async () => {
      vi.mocked(ServiceabilityRuleModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const result = await service.checkServiceability({ postalCode: "799999" });

      expect(result.state).toBe(ServiceabilityState.NOT_SERVICEABLE);
      expect(result.serviceable).toBe(false);
      expect(result.reason).toContain("unavailable");
    });

    it("should cache successful check results in memory", async () => {
      const mockLean = vi.fn().mockResolvedValue(null);
      vi.mocked(ServiceabilityRuleModel.findOne).mockReturnValue({
        lean: mockLean,
      } as any);

      // First check calls DB
      const result1 = await service.checkServiceability({ postalCode: "110001" });
      expect(result1.serviceable).toBe(true);
      expect(mockLean).toHaveBeenCalledTimes(1);

      // Second check should hit in-memory TTL cache without DB query
      const result2 = await service.checkServiceability({ postalCode: "110001" });
      expect(result2.serviceable).toBe(true);
      expect(mockLean).toHaveBeenCalledTimes(1);
    });
  });

  describe("Administrative Rule Management", () => {
    it("should create a new serviceability rule and log audit trail", async () => {
      vi.mocked(ServiceabilityRuleModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const mockRule = {
        _id: "rule-100",
        postalCode: "641001",
        country: "IN",
        serviceable: true,
        status: "ACTIVE",
        city: "Coimbatore",
        state: "Tamil Nadu",
        estimatedDeliveryDays: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: () => mockRule,
      };

      vi.mocked(ServiceabilityRuleModel.create).mockResolvedValue(mockRule as any);

      const result = await service.createRule(
        {
          postalCode: "641001",
          country: "IN",
          serviceable: true,
          city: "Coimbatore",
          state: "Tamil Nadu",
          estimatedDeliveryDays: 3,
        },
        { actorId: "staff-1", actorEmail: "admin@verona.com", ipAddress: "127.0.0.1" }
      );

      expect(result.postalCode).toBe("641001");
      expect(result.city).toBe("Coimbatore");
      expect(AuditLogModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: "staff-1",
          action: "CREATE",
          entity: "SERVICEABILITY_RULE",
        })
      );
    });
  });
});
