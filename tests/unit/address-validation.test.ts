import { describe, it, expect } from "vitest";
import {
  CreateAddressSchema,
  UpdateAddressSchema,
  normalizeIndianPhone,
  validateAndNormalizePincode,
} from "@/modules/addresses/address.validation";
import { isValidIndiaState, normalizeIndiaState } from "@/constants/india-states";
import { AddressType } from "@/constants/status";

describe("Phase 16 — Address & Indian Localization Validation Unit Tests", () => {
  describe("Indian Phone Number Validation & Normalization", () => {
    it("should accept valid 10-digit Indian numbers starting with 6, 7, 8, 9", () => {
      const phones = ["9820098200", "8123456789", "7001234567", "6380123456"];
      for (const phone of phones) {
        const normalized = normalizeIndianPhone(phone);
        expect(normalized).toBe(`+91 ${phone}`);
      }
    });

    it("should strip +91, 91, or leading 0 prefix and format cleanly", () => {
      expect(normalizeIndianPhone("+91 9820098200")).toBe("+91 9820098200");
      expect(normalizeIndianPhone("919820098200")).toBe("+91 9820098200");
      expect(normalizeIndianPhone("09820098200")).toBe("+91 9820098200");
    });

    it("should reject invalid mobile numbers in CreateAddressSchema", () => {
      const invalidPhones = ["1234567890", "5987654321", "98200", "abcdefghij", ""];
      for (const phone of invalidPhones) {
        const result = CreateAddressSchema.safeParse({
          fullName: "Aria Sharma",
          phone,
          addressLine1: "123 High Street",
          city: "Mumbai",
          state: "Maharashtra",
          postalCode: "400001",
        });
        expect(result.success).toBe(false);
      }
    });
  });

  describe("Indian Postal Code (PIN code) Validation", () => {
    it("should accept valid 6-digit Indian PIN codes", () => {
      const validCodes = ["600001", "110001", "560001", "400050", "700001"];
      for (const code of validCodes) {
        expect(validateAndNormalizePincode(code)).toBe(code);
        expect(validateAndNormalizePincode(`  ${code}  `)).toBe(code);
      }
    });

    it("should reject PIN codes starting with 0", () => {
      expect(() => validateAndNormalizePincode("012345")).toThrow();
    });

    it("should reject PIN codes with incorrect length or letters", () => {
      const invalidCodes = ["123", "12345", "1234567", "60000A", "ABCDEF", ""];
      for (const code of invalidCodes) {
        expect(() => validateAndNormalizePincode(code)).toThrow();
      }
    });
  });

  describe("Indian States & Union Territories Centralized Validation", () => {
    it("should validate all 28 states and 8 union territories", () => {
      expect(isValidIndiaState("Tamil Nadu")).toBe(true);
      expect(isValidIndiaState("Maharashtra")).toBe(true);
      expect(isValidIndiaState("Delhi")).toBe(true);
      expect(isValidIndiaState("Karnataka")).toBe(true);
      expect(isValidIndiaState("Puducherry")).toBe(true);
    });

    it("should support case-insensitive and code matching", () => {
      expect(isValidIndiaState("tamil nadu")).toBe(true);
      expect(isValidIndiaState("MH")).toBe(true);
      expect(isValidIndiaState("DL")).toBe(true);
      expect(normalizeIndiaState("tamil nadu")).toBe("Tamil Nadu");
      expect(normalizeIndiaState("KA")).toBe("Karnataka");
    });

    it("should reject non-Indian states or fabricated entities", () => {
      expect(isValidIndiaState("California")).toBe(false);
      expect(isValidIndiaState("London")).toBe(false);
      expect(isValidIndiaState("")).toBe(false);
    });
  });

  describe("CreateAddressSchema Full Validation", () => {
    it("should validate and normalize a complete, valid Indian address", () => {
      const input = {
        fullName: "Aria Sharma",
        phone: "9820098200",
        addressLine1: "12 Bandra Atelier Road",
        addressLine2: "Suite 4B",
        landmark: "Near Art House",
        city: "Mumbai",
        state: "maharashtra",
        postalCode: " 400050 ",
        type: AddressType.HOME,
        isDefault: true,
      };

      const result = CreateAddressSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fullName).toBe("Aria Sharma");
        expect(result.data.phone).toBe("+91 9820098200");
        expect(result.data.state).toBe("Maharashtra");
        expect(result.data.postalCode).toBe("400050");
        expect(result.data.country).toBe("India");
        expect(result.data.isDefault).toBe(true);
      }
    });

    it("should reject payloads with missing mandatory fields", () => {
      const result = CreateAddressSchema.safeParse({
        fullName: "Aria Sharma",
        // missing phone, addressLine1, city, state, postalCode
      });
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateAddressSchema Partial Validation", () => {
    it("should permit partial address field updates", () => {
      const result = UpdateAddressSchema.safeParse({
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.city).toBe("Bengaluru");
        expect(result.data.state).toBe("Karnataka");
        expect(result.data.postalCode).toBe("560001");
      }
    });
  });
});
