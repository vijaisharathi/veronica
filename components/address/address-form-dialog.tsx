"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { AddressForm } from "./address-form";
import { AddressDTO, CreateAddressInput } from "@/modules/addresses/address.types";

interface AddressFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAddressInput) => Promise<void>;
  initialData?: AddressDTO | null;
  isSubmitting?: boolean;
}

export function AddressFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting = false,
}: AddressFormDialogProps) {
  const isEditing = Boolean(initialData);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Delivery Address" : "Add New Delivery Address"}
      description={
        isEditing
          ? "Update your delivery contact details and postal address."
          : "Save a new shipping address to your private atelier account."
      }
      maxWidth="lg"
    >
      <div className="mt-4">
        <AddressForm
          initialData={initialData}
          onSubmit={async (data) => {
            await onSubmit(data);
            onClose();
          }}
          onCancel={onClose}
          isSubmitting={isSubmitting}
        />
      </div>
    </Dialog>
  );
}
