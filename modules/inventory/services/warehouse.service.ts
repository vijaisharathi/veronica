import { warehouseRepository } from "../repositories/warehouse.repository";
import { WarehouseDto } from "../types/inventory.types";
import { IWarehouse } from "@/types/database";
import { WarehouseStatus } from "@/constants/status";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";

function toWarehouseDto(wh: IWarehouse): WarehouseDto {
  return {
    id: wh._id.toString(),
    code: wh.code,
    name: wh.name,
    address: wh.address,
    contact: wh.contact,
    status: wh.status || (wh.active ? WarehouseStatus.ACTIVE : WarehouseStatus.INACTIVE),
    active: wh.active,
    operatingStatus: wh.operatingStatus,
    createdAt: wh.createdAt ? wh.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: wh.updatedAt ? wh.updatedAt.toISOString() : new Date().toISOString(),
  };
}

export class WarehouseService {
  async listWarehouses(options?: {
    status?: WarehouseStatus;
    active?: boolean;
    search?: string;
  }): Promise<WarehouseDto[]> {
    const list = await warehouseRepository.findAll(options);
    return list.map(toWarehouseDto);
  }

  async getWarehouseById(id: string): Promise<WarehouseDto> {
    const wh = await warehouseRepository.findById(id);
    if (!wh) {
      throw new NotFoundError("Warehouse", id);
    }
    return toWarehouseDto(wh);
  }

  async getWarehouseByCode(code: string): Promise<WarehouseDto | null> {
    const wh = await warehouseRepository.findByCode(code);
    return wh ? toWarehouseDto(wh) : null;
  }

  async createWarehouse(data: {
    code: string;
    name: string;
    address: IWarehouse["address"];
    contact: IWarehouse["contact"];
    status?: WarehouseStatus;
    operatingStatus?: string;
  }): Promise<WarehouseDto> {
    const normalizedCode = data.code.toUpperCase().trim();
    const existing = await warehouseRepository.findByCode(normalizedCode);
    if (existing) {
      throw new ConflictError(`Warehouse with code '${normalizedCode}' already exists`);
    }

    const created = await warehouseRepository.create({
      ...data,
      code: normalizedCode,
      status: data.status || WarehouseStatus.ACTIVE,
      active: data.status ? data.status === WarehouseStatus.ACTIVE : true,
      operatingStatus: data.operatingStatus || "OPERATIONAL",
    });

    logger.info("Warehouse created", {
      context: "WarehouseService",
      metadata: { warehouseId: created._id.toString(), code: created.code },
    });

    return toWarehouseDto(created);
  }

  async updateWarehouse(
    id: string,
    data: Partial<{
      name: string;
      address: IWarehouse["address"];
      contact: IWarehouse["contact"];
      status: WarehouseStatus;
      operatingStatus: string;
    }>
  ): Promise<WarehouseDto> {
    const existing = await warehouseRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Warehouse", id);
    }

    const updated = await warehouseRepository.update(id, data);
    if (!updated) {
      throw new NotFoundError("Warehouse", id);
    }

    logger.info("Warehouse updated", {
      context: "WarehouseService",
      metadata: { warehouseId: id, code: updated.code, status: updated.status },
    });

    return toWarehouseDto(updated);
  }
}

export const warehouseService = new WarehouseService();
