"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { AddressCard } from "@/components/address/address-card";
import { AddressFormDialog } from "@/components/address/address-form-dialog";
import { AddressDTO, CreateAddressInput } from "@/modules/addresses/address.types";

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = React.useState<AddressDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Modal & mutation states
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAddress, setEditingAddress] = React.useState<AddressDTO | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Deletion confirmation
  const [deletingAddress, setDeletingAddress] = React.useState<AddressDTO | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Load addresses on mount
  const fetchAddresses = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/addresses");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to load saved addresses.");
      }
      setAddresses(json.data || []);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error fetching addresses.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Handle Create or Update
  const handleSaveAddress = async (input: CreateAddressInput) => {
    setIsSubmitting(true);
    try {
      if (editingAddress) {
        const res = await fetch(`/api/addresses/${editingAddress.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message || "Failed to update address.");
        }
      } else {
        const res = await fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message || "Failed to create address.");
        }
      }
      setIsFormOpen(false);
      setEditingAddress(null);
      await fetchAddresses();
    } catch (err: unknown) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Set Default
  const handleSetDefault = async (address: AddressDTO) => {
    try {
      const res = await fetch(`/api/addresses/${address.id}/default`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to set default address.");
      }
      await fetchAddresses();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error setting default address.");
    }
  };

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!deletingAddress) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/addresses/${deletingAddress.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to delete address.");
      }
      setDeletingAddress(null);
      await fetchAddresses();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting address.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/account"
          className="inline-flex items-center text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          Back to Client Account
        </Link>
        <span className="text-[10px] font-semibold tracking-widest text-primary uppercase">
          Client Portal
        </span>
      </div>

      {/* Header Banner */}
      <div className="border-b border-border/80 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground">
              Delivery Addresses
            </h1>
            <Badge variant="outline" className="text-[10px] tracking-wider uppercase font-mono">
              {addresses.length} {addresses.length === 1 ? "Address" : "Addresses"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Manage and organize your delivery locations for swift, secure atelier dispatches across India.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingAddress(null);
            setIsFormOpen(true);
          }}
          className="text-xs tracking-wider uppercase px-4 h-9"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add New Address
        </Button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-start gap-2.5 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Unable to load addresses</p>
            <p className="mt-0.5 text-red-600 dark:text-red-400">{errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAddresses}
              className="mt-2 text-[11px] h-7 px-2"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          <p className="text-xs tracking-wider uppercase">Loading atelier addresses...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !errorMessage && addresses.length === 0 && (
        <EmptyState
          title="No Delivery Addresses Saved"
          description="You have not saved any shipping addresses yet. Add your primary residence or workplace for seamless checkout."
          actionLabel="Add Your First Address"
          onAction={() => {
            setEditingAddress(null);
            setIsFormOpen(true);
          }}
        />
      )}

      {/* Addresses Grid */}
      {!isLoading && addresses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={(target) => {
                setEditingAddress(target);
                setIsFormOpen(true);
              }}
              onDelete={(target) => setDeletingAddress(target)}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      <AddressFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAddress(null);
        }}
        onSubmit={handleSaveAddress}
        initialData={editingAddress}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(deletingAddress)}
        onClose={() => setDeletingAddress(null)}
        onConfirm={confirmDelete}
        title="Delete Delivery Address"
        message={
          deletingAddress?.isDefault
            ? `Are you sure you want to delete your default address (${deletingAddress?.fullName})? Another active address will automatically be designated as your default shipping location.`
            : `Are you sure you want to delete the address for ${deletingAddress?.fullName}? This action cannot be undone.`
        }
        confirmLabel={isDeleting ? "Deleting..." : "Confirm Delete"}
        cancelLabel="Keep Address"
      />
    </div>
  );
}
