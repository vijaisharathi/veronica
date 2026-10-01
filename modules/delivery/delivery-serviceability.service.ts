/**
 * VÉRONA — Delivery Serviceability Central Domain Service
 *
 * Single authoritative service managing pincode serviceability checks,
 * in-memory TTL caching, fallback resolution, and administrative rule configurations.
 */

import { IDeliveryServiceabilityProvider } from "./providers/delivery-provider.interface";
import { shippingProviderAdapter } from "./providers/shipping-provider.adapter";
import {
  CheckServiceabilityParams,
  DeliveryServiceabilityResult,
  ServiceabilityRuleDTO,
  CreateServiceabilityRuleInput,
  UpdateServiceabilityRuleInput,
  ServiceabilitySource,
  ServiceabilityState,
} from "./delivery.types";
import {
  CheckServiceabilitySchema,
  CreateServiceabilityRuleSchema,
  UpdateServiceabilityRuleSchema,
  RuleIdParamSchema,
} from "./delivery.validation";
import { ServiceabilityRuleModel, AuditLogModel } from "@/db/models";
import { IServiceabilityRule } from "@/types/database";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";

interface CacheEntry {
  result: DeliveryServiceabilityResult;
  expiresAt: number;
}

// 15 minutes TTL for serviceability cache
const CACHE_TTL_MS = 15 * 60 * 1000;

export class DeliveryServiceabilityService {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private readonly provider: IDeliveryServiceabilityProvider = shippingProviderAdapter
  ) {}

  /**
   * Clears the in-memory serviceability cache.
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Converts a database rule into a clean DTO.
   */
  private toRuleDTO(rule: IServiceabilityRule): ServiceabilityRuleDTO {
    return {
      id: rule._id.toString(),
      postalCode: rule.postalCode,
      country: rule.country,
      serviceable: rule.serviceable,
      status: rule.status,
      city: rule.city,
      state: rule.state,
      estimatedDeliveryDays: rule.estimatedDeliveryDays,
      reason: rule.reason,
      createdAt: rule.createdAt instanceof Date ? rule.createdAt.toISOString() : String(rule.createdAt),
      updatedAt: rule.updatedAt instanceof Date ? rule.updatedAt.toISOString() : String(rule.updatedAt),
    };
  }

  /**
   * Evaluates delivery serviceability for a postal code.
   *
   * Business Rules:
   * 1. Distinguishes syntax validity from serviceability (syntax checked first).
   * 2. Checks cached results to minimize redundant evaluation.
   * 3. Delegates to the configured provider (or rule engine fallback).
   */
  async checkServiceability(
    rawParams: CheckServiceabilityParams
  ): Promise<DeliveryServiceabilityResult> {
    const rawPostal = rawParams.postalCode?.trim() || "";
    const rawCountry = (rawParams.country?.trim() || "IN").toUpperCase();

    // 1. Syntactic format check
    const validation = CheckServiceabilitySchema.safeParse({
      postalCode: rawPostal,
      country: rawCountry,
    });

    if (!validation.success) {
      return {
        serviceable: false,
        state: ServiceabilityState.INVALID_PINCODE,
        postalCode: rawPostal,
        country: rawCountry,
        reason: "Please enter a valid 6-digit Indian PIN code (cannot start with 0)",
        source: ServiceabilitySource.CONFIGURED_RULES,
        checkedAt: new Date().toISOString(),
      };
    }

    const { postalCode, country } = validation.data;
    const cacheKey = `${country}:${postalCode}`;

    // 2. Check in-memory TTL cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    // 3. Delegate to provider
    const result = await this.provider.checkServiceability({
      postalCode,
      country,
      cart: rawParams.cart,
    });

    // 4. Cache stable result
    if (result.state === ServiceabilityState.SERVICEABLE || result.state === ServiceabilityState.NOT_SERVICEABLE) {
      this.cache.set(cacheKey, {
        result,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }

    return result;
  }

  // -------------------------------------------------------------
  // ADMINISTRATIVE SERVICEABILITY RULE MANAGEMENT
  // -------------------------------------------------------------

  /**
   * Lists configured serviceability rules with pagination and optional search filter.
   */
  async listRules(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ rules: ServiceabilityRuleDTO[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (params.status) {
      query.status = params.status;
    }

    if (params.search) {
      const searchRegex = new RegExp(params.search.trim(), "i");
      query.$or = [
        { postalCode: searchRegex },
        { city: searchRegex },
        { state: searchRegex },
      ];
    }

    const [rules, total] = await Promise.all([
      ServiceabilityRuleModel.find(query).sort({ postalCode: 1 }).skip(skip).limit(limit).lean<IServiceabilityRule[]>(),
      ServiceabilityRuleModel.countDocuments(query),
    ]);

    return {
      rules: rules.map((r) => this.toRuleDTO(r)),
      total,
      page,
      limit,
    };
  }

  /**
   * Retrieves a single serviceability rule by ID.
   */
  async getRuleById(ruleId: string): Promise<ServiceabilityRuleDTO> {
    const parsedId = RuleIdParamSchema.safeParse({ id: ruleId });
    if (!parsedId.success) {
      throw new ValidationError("Invalid serviceability rule ID format");
    }

    const rule = await ServiceabilityRuleModel.findById(ruleId).lean<IServiceabilityRule>();
    if (!rule) {
      throw new NotFoundError("ServiceabilityRule", ruleId);
    }

    return this.toRuleDTO(rule);
  }

  /**
   * Creates a new postal serviceability rule.
   */
  async createRule(
    rawInput: CreateServiceabilityRuleInput,
    actorContext?: { actorId: string; actorEmail?: string; ipAddress?: string }
  ): Promise<ServiceabilityRuleDTO> {
    const validation = CreateServiceabilityRuleSchema.safeParse(rawInput);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || "Invalid rule configuration";
      throw new ValidationError(firstIssue, validation.error.flatten());
    }

    const data = validation.data;

    // Check unique constraint { postalCode, country }
    const existing = await ServiceabilityRuleModel.findOne({
      postalCode: data.postalCode,
      country: data.country,
    }).lean<IServiceabilityRule>();

    if (existing) {
      throw new ConflictError(
        `Serviceability rule for PIN code '${data.postalCode}' in country '${data.country}' already exists`
      );
    }

    const created = await ServiceabilityRuleModel.create(data);
    this.clearCache();

    if (actorContext) {
      await AuditLogModel.create({
        actorId: actorContext.actorId,
        actorEmail: actorContext.actorEmail,
        actorType: "STAFF",
        action: "CREATE",
        entity: "SERVICEABILITY_RULE",
        entityId: created._id.toString(),
        changes: { before: null, after: created.toObject() },
        ipAddress: actorContext.ipAddress,
        createdAt: new Date(),
      }).catch((err) => logger.warn("Failed to create audit log for rule creation", { err }));
    }

    logger.info("Created delivery serviceability rule", {
      context: "DeliveryServiceabilityService",
      metadata: { postalCode: data.postalCode, serviceable: data.serviceable },
    });

    return this.toRuleDTO(created.toObject() as IServiceabilityRule);
  }

  /**
   * Updates an existing serviceability rule.
   */
  async updateRule(
    ruleId: string,
    rawInput: UpdateServiceabilityRuleInput,
    actorContext?: { actorId: string; actorEmail?: string; ipAddress?: string }
  ): Promise<ServiceabilityRuleDTO> {
    const parsedId = RuleIdParamSchema.safeParse({ id: ruleId });
    if (!parsedId.success) {
      throw new ValidationError("Invalid serviceability rule ID format");
    }

    const existing = await ServiceabilityRuleModel.findById(ruleId).lean<IServiceabilityRule>();
    if (!existing) {
      throw new NotFoundError("ServiceabilityRule", ruleId);
    }

    const validation = UpdateServiceabilityRuleSchema.safeParse(rawInput);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || "Invalid rule configuration";
      throw new ValidationError(firstIssue, validation.error.flatten());
    }

    const updates = validation.data;
    const updated = await ServiceabilityRuleModel.findByIdAndUpdate(
      ruleId,
      { $set: updates },
      { new: true }
    ).lean<IServiceabilityRule>();

    if (!updated) {
      throw new NotFoundError("ServiceabilityRule", ruleId);
    }

    this.clearCache();

    if (actorContext) {
      await AuditLogModel.create({
        actorId: actorContext.actorId,
        actorEmail: actorContext.actorEmail,
        actorType: "STAFF",
        action: "UPDATE",
        entity: "SERVICEABILITY_RULE",
        entityId: ruleId,
        changes: { before: existing, after: updated },
        ipAddress: actorContext.ipAddress,
        createdAt: new Date(),
      }).catch((err) => logger.warn("Failed to create audit log for rule update", { err }));
    }

    return this.toRuleDTO(updated);
  }

  /**
   * Deletes a serviceability rule.
   */
  async deleteRule(
    ruleId: string,
    actorContext?: { actorId: string; actorEmail?: string; ipAddress?: string }
  ): Promise<{ deleted: boolean }> {
    const parsedId = RuleIdParamSchema.safeParse({ id: ruleId });
    if (!parsedId.success) {
      throw new ValidationError("Invalid serviceability rule ID format");
    }

    const existing = await ServiceabilityRuleModel.findById(ruleId).lean<IServiceabilityRule>();
    if (!existing) {
      throw new NotFoundError("ServiceabilityRule", ruleId);
    }

    await ServiceabilityRuleModel.findByIdAndDelete(ruleId);
    this.clearCache();

    if (actorContext) {
      await AuditLogModel.create({
        actorId: actorContext.actorId,
        actorEmail: actorContext.actorEmail,
        actorType: "STAFF",
        action: "DELETE",
        entity: "SERVICEABILITY_RULE",
        entityId: ruleId,
        changes: { before: existing, after: null },
        ipAddress: actorContext.ipAddress,
        createdAt: new Date(),
      }).catch((err) => logger.warn("Failed to create audit log for rule deletion", { err }));
    }

    return { deleted: true };
  }
}

export const deliveryServiceabilityService = new DeliveryServiceabilityService();
