/**
 * VÉRONA — Centralized Indian States & Union Territories
 *
 * Authoritative registry of all 28 States and 8 Union Territories of India.
 * Provides consistent naming, ISO codes, and postal zone groupings to eliminate
 * inconsistent free-text entries across checkout, customer addresses, and logistics.
 */

export interface IndiaStateDefinition {
  code: string;
  name: string;
  type: "STATE" | "UNION_TERRITORY";
  zone: "NORTH" | "SOUTH" | "EAST" | "WEST" | "CENTRAL" | "NORTH_EAST";
}

export const INDIA_STATES: readonly IndiaStateDefinition[] = [
  // 28 States
  { code: "AP", name: "Andhra Pradesh", type: "STATE", zone: "SOUTH" },
  { code: "AR", name: "Arunachal Pradesh", type: "STATE", zone: "NORTH_EAST" },
  { code: "AS", name: "Assam", type: "STATE", zone: "NORTH_EAST" },
  { code: "BR", name: "Bihar", type: "STATE", zone: "EAST" },
  { code: "CG", name: "Chhattisgarh", type: "STATE", zone: "CENTRAL" },
  { code: "GA", name: "Goa", type: "STATE", zone: "WEST" },
  { code: "GJ", name: "Gujarat", type: "STATE", zone: "WEST" },
  { code: "HR", name: "Haryana", type: "STATE", zone: "NORTH" },
  { code: "HP", name: "Himachal Pradesh", type: "STATE", zone: "NORTH" },
  { code: "JH", name: "Jharkhand", type: "STATE", zone: "EAST" },
  { code: "KA", name: "Karnataka", type: "STATE", zone: "SOUTH" },
  { code: "KL", name: "Kerala", type: "STATE", zone: "SOUTH" },
  { code: "MP", name: "Madhya Pradesh", type: "STATE", zone: "CENTRAL" },
  { code: "MH", name: "Maharashtra", type: "STATE", zone: "WEST" },
  { code: "MN", name: "Manipur", type: "STATE", zone: "NORTH_EAST" },
  { code: "ML", name: "Meghalaya", type: "STATE", zone: "NORTH_EAST" },
  { code: "MZ", name: "Mizoram", type: "STATE", zone: "NORTH_EAST" },
  { code: "NL", name: "Nagaland", type: "STATE", zone: "NORTH_EAST" },
  { code: "OD", name: "Odisha", type: "STATE", zone: "EAST" },
  { code: "PB", name: "Punjab", type: "STATE", zone: "NORTH" },
  { code: "RJ", name: "Rajasthan", type: "STATE", zone: "NORTH" },
  { code: "SK", name: "Sikkim", type: "STATE", zone: "NORTH_EAST" },
  { code: "TN", name: "Tamil Nadu", type: "STATE", zone: "SOUTH" },
  { code: "TG", name: "Telangana", type: "STATE", zone: "SOUTH" },
  { code: "TR", name: "Tripura", type: "STATE", zone: "NORTH_EAST" },
  { code: "UP", name: "Uttar Pradesh", type: "STATE", zone: "NORTH" },
  { code: "UK", name: "Uttarakhand", type: "STATE", zone: "NORTH" },
  { code: "WB", name: "West Bengal", type: "STATE", zone: "EAST" },

  // 8 Union Territories
  { code: "AN", name: "Andaman and Nicobar Islands", type: "UNION_TERRITORY", zone: "SOUTH" },
  { code: "CH", name: "Chandigarh", type: "UNION_TERRITORY", zone: "NORTH" },
  { code: "DH", name: "Dadra and Nagar Haveli and Daman and Diu", type: "UNION_TERRITORY", zone: "WEST" },
  { code: "DL", name: "Delhi", type: "UNION_TERRITORY", zone: "NORTH" },
  { code: "JK", name: "Jammu and Kashmir", type: "UNION_TERRITORY", zone: "NORTH" },
  { code: "LA", name: "Ladakh", type: "UNION_TERRITORY", zone: "NORTH" },
  { code: "LD", name: "Lakshadweep", type: "UNION_TERRITORY", zone: "SOUTH" },
  { code: "PY", name: "Puducherry", type: "UNION_TERRITORY", zone: "SOUTH" },
] as const;

export const INDIA_STATE_NAMES = INDIA_STATES.map((s) => s.name);

export function isValidIndiaState(stateName: string): boolean {
  if (!stateName) return false;
  const normalized = stateName.trim().toLowerCase();
  return INDIA_STATES.some(
    (s) => s.name.toLowerCase() === normalized || s.code.toLowerCase() === normalized
  );
}

export function normalizeIndiaState(stateName: string): string | null {
  if (!stateName) return null;
  const normalized = stateName.trim().toLowerCase();
  const matched = INDIA_STATES.find(
    (s) => s.name.toLowerCase() === normalized || s.code.toLowerCase() === normalized
  );
  return matched ? matched.name : null;
}
