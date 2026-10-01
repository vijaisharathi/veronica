"use client";

import * as React from "react";
import { Plus, MapPin, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddressCard } from "./address-card";
import { AddressFormDialog } from "./address-form-dialog";
import { AddressDTO, CreateAddressInput } from "@/modules/addresses/address.types";

interface AddressSelectorProps {
  addresses: AddressDTO[];
  selectedAddressId?: string | null;
  onSelectAddress: (address: AddressDTO) => void;
  onAddressCreated?: (address: AddressDTO) => void;
  onAddressUpdated?: (address: AddressDTO) => void;
  onAddressDeleted?: (addressId: string) => void;
  isLoading?: boolean;
}

/**
 * VÉRONA — Reusable Address Selector Foundation
 *
 * Prepared for Phase 17 Checkout: allows browsing, selecting, and adding delivery
 * addresses within a streamlined checkout or bag review workflow.
 */
export function AddressSelector({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddressCreated,
  onAddressUpdated,
  onAddressDeleted,
  isLoading = false,
}: AddressSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingAddress, setEditingAddress] = React.useState<AddressDTO | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const handleCreateOrUpdate = async (input: CreateAddressInput) => {
    setIsSubmitting(true);
    setActionError(null);

    try {
      if (editingAddress) {
        const res = await fetch(`/api/addresses/${editingAddress.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message || "Failed to update address");
        }
        if (onAddressUpdated) onAddressUpdated(json.data);
      } else {
        const res = await fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message || "Failed to create address");
        }
        if (onAddressCreated) onAddressCreated(json.data);
        // Automatically select the newly created address
        onSelectAddress(json.data);
      }
      setIsDialogOpen(false);
      setEditingAddress(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving address";
      setActionError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (address: AddressDTO) => {
    if (!window.confirm(`Delete address for ${address.fullName}?`)) return;
    try {
      const res = await fetch(`/api/addresses/${address.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to delete address");
      }
      if (onAddressDeleted) onAddressDeleted(address.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting address");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-xs">Loading saved addresses...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{actionError}</p>
        </div>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-neutral-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Delivery Destination
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingAddress(null);
            setIsDialogOpen(true);
          }}
          className="text-xs tracking-wider uppercase h-8"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Address
        </Button>
      </div>

      {/* Address Cards Grid */}
      {addresses.length === 0 ? (
        <div className="rounded border border-dashed border-border p-6 text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            No saved delivery addresses found. Add a destination address to proceed.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setEditingAddress(null);
              setIsDialogOpen(true);
            }}
            className="text-xs"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add First Address
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => {
            const isSelected = selectedAddressId === addr.id || (!selectedAddressId && addr.isDefault);
            return (
              <AddressCard
                key={addr.id}
                address={addr}
                selectable={true}
                isSelected={isSelected}
                onSelect={(selected) => onSelectAddress(selected)}
                onEdit={(target) => {
                  setEditingAddress(target);
                  setIsDialogOpen(true);
                }}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <AddressFormDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingAddress(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingAddress}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
