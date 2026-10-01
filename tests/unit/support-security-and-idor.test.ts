import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateTicketNumber } from "@/modules/support/services/ticket-number.service";
import {
  supportAttachmentService,
  ALLOWED_MIME_TYPES,
  FORBIDDEN_EXTENSIONS,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "@/modules/support/services/support-attachment.service";
import { supportContextService } from "@/modules/support/services/support-context.service";
import { OrderModel, ReturnRequestModel, RefundModel, ShipmentModel, ProductModel } from "@/db/models";
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors";

describe("Phase 26 — Support Security, Anti-IDOR & Attachment Controls", () => {
  describe("Ticket Number Generation Security", () => {
    it("generates customer-safe, formatted ticket numbers SUP-YYYY-XXXXXX", () => {
      const ticketNum = generateTicketNumber();
      const currentYear = new Date().getFullYear();

      expect(ticketNum).toMatch(new RegExp(`^SUP-${currentYear}-[A-Z0-9]{6}$`));
    });

    it("generates unique ticket numbers across rapid consecutive calls", () => {
      const set = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const num = generateTicketNumber();
        expect(set.has(num)).toBe(false);
        set.add(num);
      }
      expect(set.size).toBe(100);
    });
  });

  describe("Attachment Security & Payload Validation", () => {
    it("accepts valid secure HTTPS media attachments (JPEG, PNG, WebP, PDF)", () => {
      const validAttachments = [
        {
          name: "invoice.pdf",
          url: "https://res.cloudinary.com/verona/raw/upload/v1/invoice.pdf",
          fileType: "application/pdf",
          fileSize: 1024 * 500, // 500KB
        },
        {
          name: "garment-seam.webp",
          url: "https://res.cloudinary.com/verona/image/upload/v1/garment.webp",
          fileType: "image/webp",
          fileSize: 1024 * 1024 * 2, // 2MB
        },
      ];

      expect(() =>
        supportAttachmentService.validateAttachments(validAttachments)
      ).not.toThrow();
    });

    it("rejects attachments exceeding the 10MB size limit", () => {
      const oversized = [
        {
          name: "large-video.mp4",
          url: "https://res.cloudinary.com/verona/video/upload/v1/large.mp4",
          fileType: "video/mp4",
          fileSize: 15 * 1024 * 1024, // 15MB (exceeds 10MB)
        },
      ];

      expect(() =>
        supportAttachmentService.validateAttachments(oversized)
      ).toThrow(ValidationError);
    });

    it("rejects more than 5 attachments per message", () => {
      const tooMany = Array.from({ length: 6 }).map((_, i) => ({
        name: `photo_${i}.png`,
        url: `https://res.cloudinary.com/verona/image/upload/photo_${i}.png`,
        fileType: "image/png",
        fileSize: 1024 * 100,
      }));

      expect(() =>
        supportAttachmentService.validateAttachments(tooMany)
      ).toThrow(ValidationError);
    });

    it("strictly blocks executable, script, and dangerous extensions", () => {
      const maliciousFiles = [
        { name: "payload.exe", url: "https://evil.com/payload.exe", fileType: "application/octet-stream" },
        { name: "script.sh", url: "https://evil.com/script.sh", fileType: "text/x-shellscript" },
        { name: "backdoor.php", url: "https://evil.com/backdoor.php", fileType: "application/x-httpd-php" },
        { name: "malicious.js", url: "https://evil.com/malicious.js", fileType: "application/javascript" },
        { name: "xss.html", url: "https://evil.com/xss.html", fileType: "text/html" },
      ];

      for (const badFile of maliciousFiles) {
        expect(() =>
          supportAttachmentService.validateAttachments([
            {
              name: badFile.name,
              url: badFile.url,
              fileType: badFile.fileType,
              fileSize: 1024,
            },
          ])
        ).toThrow(ValidationError);
      }
    });

    it("rejects non-HTTPS insecure attachment URLs", () => {
      const insecure = [
        {
          name: "photo.jpg",
          url: "http://insecure.com/photo.jpg", // HTTP instead of HTTPS
          fileType: "image/jpeg",
          fileSize: 1024,
        },
      ];

      expect(() =>
        supportAttachmentService.validateAttachments(insecure)
      ).toThrow(ValidationError);
    });
  });

  describe("Anti-IDOR Context Ownership Verification", () => {
    const customerA = "507f1f77bcf86cd799439011";
    const customerB = "507f1f77bcf86cd799439022";
    const validOrderId = "507f1f77bcf86cd799439033";
    const validReturnId = "507f1f77bcf86cd799439044";

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("rejects ticket creation if customer A attempts to link customer B's order", async () => {
      // Mock OrderModel.findById returning order belonging to Customer B
      vi.spyOn(OrderModel, "findById").mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: validOrderId,
            customerId: customerB, // Owned by Customer B!
            orderNumber: "ORD-2026-999999",
          }),
        }),
      } as any);

      await expect(
        supportContextService.validateContextOwnership(customerA, {
          orderId: validOrderId,
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("allows ticket creation when customer A links their own order", async () => {
      vi.spyOn(OrderModel, "findById").mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: validOrderId,
            customerId: customerA, // Owned by Customer A
            orderNumber: "ORD-2026-111111",
          }),
        }),
      } as any);

      await expect(
        supportContextService.validateContextOwnership(customerA, {
          orderId: validOrderId,
        })
      ).resolves.not.toThrow();
    });

    it("rejects ticket creation if customer A attempts to link customer B's return request", async () => {
      vi.spyOn(ReturnRequestModel, "findById").mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: validReturnId,
            customerId: customerB, // Owned by Customer B!
            returnNumber: "RET-2026-999999",
          }),
        }),
      } as any);

      await expect(
        supportContextService.validateContextOwnership(customerA, {
          returnRequestId: validReturnId,
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("throws NotFoundError when a non-existent order is referenced", async () => {
      vi.spyOn(OrderModel, "findById").mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      } as any);

      await expect(
        supportContextService.validateContextOwnership(customerA, {
          orderId: validOrderId,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
