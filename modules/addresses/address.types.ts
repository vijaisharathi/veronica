/**
 * VÉRONA — Customer Address Domain Types & DTOs
 */

import { AddressType } from "@/constants/status";

export interface AddressDTO {
  id: string;
  customerId: string;
  type: AddressType;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressInput {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  type?: AddressType;
  isDefault?: boolean;
}

export interface UpdateAddressInput {
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  type?: AddressType;
  isDefault?: boolean;
}

/**
 * Clean address contract for future Phase 17 Checkout consumption.
 */
export interface CheckoutAddressReference {
  addressId: string;
  fullName: string;
  phone: string;
  formattedAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type: AddressType;
  isDefault: boolean;
}
