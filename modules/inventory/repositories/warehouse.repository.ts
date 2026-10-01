import { WarehouseModel } from "@/db/models";
import { IWarehouse } from "@/types/database";
import { WarehouseStatus } from "@/constants/status";

export class WarehouseRepository {
  async findAll(options?: {
    status?: WarehouseStatus;
    active?: boolean;
    search?: string;
  }): Promise<IWarehouse[]> {
    const filter: Record<string, unknown> = {};

    if (options?.status) {
      filter.status = options.status;
    } else if (options?.active !== undefined) {
      filter.active = options.active;
    }

    if (options?.search) {
      const searchRegex = new RegExp(options.search, "i");
      filter.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { "address.city": searchRegex },
        { "address.state": searchRegex },
      ];
    }

    return WarehouseModel.find(filter).sort({ name: 1 }).lean<IWarehouse[]>();
  }

  async findActiveWarehouses(): Promise<IWarehouse[]> {
    return WarehouseModel.find({
      status: WarehouseStatus.ACTIVE,
      active: true,
    })
      .sort({ code: 1 })
      .lean<IWarehouse[]>();
  }

  async findById(id: string): Promise<IWarehouse | null> {
    return WarehouseModel.findById(id).lean<IWarehouse>();
  }

  async findByCode(code: string): Promise<IWarehouse | null> {
    return WarehouseModel.findOne({ code: code.toUpperCase().trim() }).lean<IWarehouse>();
  }

  async create(data: Partial<IWarehouse>): Promise<IWarehouse> {
    const created = await WarehouseModel.create({
      ...data,
      code: data.code?.toUpperCase().trim(),
      status: data.status || WarehouseStatus.ACTIVE,
      active: data.status ? data.status === WarehouseStatus.ACTIVE : true,
    });
    return created.toObject<IWarehouse>();
  }

  async update(id: string, data: Partial<IWarehouse>): Promise<IWarehouse | null> {
    const updatePayload: Record<string, unknown> = { ...data };
    if (data.status) {
      updatePayload.active = data.status === WarehouseStatus.ACTIVE;
    }

    return WarehouseModel.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).lean<IWarehouse>();
  }

  async count(): Promise<number> {
    return WarehouseModel.countDocuments();
  }
}

export const warehouseRepository = new WarehouseRepository();
