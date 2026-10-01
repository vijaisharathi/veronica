"use client";

import * as React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INDIA_STATES } from "@/constants/india-states";
import { AddressType } from "@/constants/status";
import { AddressDTO, CreateAddressInput } from "@/modules/addresses/address.types";

interface AddressFormProps {
  initialData?: AddressDTO | null;
  onSubmit: (data: CreateAddressInput) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function AddressForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AddressFormProps) {
  const [fullName, setFullName] = React.useState(initialData?.fullName || "");
  const [phone, setPhone] = React.useState(
    initialData?.phone ? initialData.phone.replace(/^\+91\s*/, "") : ""
  );
  const [addressLine1, setAddressLine1] = React.useState(initialData?.addressLine1 || "");
  const [addressLine2, setAddressLine2] = React.useState(initialData?.addressLine2 || "");
  const [landmark, setLandmark] = React.useState(initialData?.landmark || "");
  const [city, setCity] = React.useState(initialData?.city || "");
  const [state, setState] = React.useState(initialData?.state || "Tamil Nadu");
  const [postalCode, setPostalCode] = React.useState(initialData?.postalCode || "");
  const [type, setType] = React.useState<AddressType>(initialData?.type || AddressType.HOME);
  const [isDefault, setIsDefault] = React.useState(initialData?.isDefault || false);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters.";
    }

    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]/.test(cleanPhone)) {
      newErrors.phone = "Enter a valid 10-digit Indian mobile number.";
    }

    if (!addressLine1.trim() || addressLine1.trim().length < 3) {
      newErrors.addressLine1 = "Street address must be at least 3 characters.";
    }

    if (!city.trim() || city.trim().length < 2) {
      newErrors.city = "City name is required.";
    }

    if (!state.trim()) {
      newErrors.state = "Please select a state.";
    }

    const cleanPincode = postalCode.trim().replace(/\s+/g, "");
    if (!cleanPincode || !/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      newErrors.postalCode = "Enter a valid 6-digit PIN code (cannot start with 0).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setServerError(null);
    if (!validate()) return;

    try {
      await onSubmit({
        fullName: fullName.trim(),
        phone: phone.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        landmark: landmark.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim().replace(/\s+/g, ""),
        country: "India",
        type,
        isDefault,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save address. Please try again.";
      setServerError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
      {serverError && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700 flex items-start gap-2 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{serverError}</p>
        </div>
      )}

      {/* Full Name & Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="address-fullName" className="block text-[11px] uppercase tracking-wider font-medium text-foreground">
            Full Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="address-fullName"
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: "" }));
            }}
            placeholder="e.g. Aria Sharma"
            disabled={isSubmitting}
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
            className="h-9 text-xs"
          />
          {errors.fullName && (
            <p id="fullName-error" className="text-[11px] text-red-600 dark:text-red-400">
              {errors.fullName}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="address-phone" className="block text-[11px] uppercase tracking-wider font-medium text-foreground">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <div className="relative flex">
            <span className="inline-flex items-center px-3 rounded-l border border-r-0 border-input bg-neutral-100 text-neutral-600 text-xs font-mono dark:bg-neutral-800 dark:text-neutral-400">
              +91
            </span>
            <Input
              id="address-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone(val);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
              }}
              placeholder="98200 98200"
              disabled={isSubmitting}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "phone-error" : undefined}
              className="h-9 text-xs rounded-l-none font-mono"
            />
          </div>
          {errors.phone && (
            <p id="phone-error" className="text-[11px] text-red-600 dark:text-red-400">
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      {/* Address Line 1 */}
      <div className="space-y-1.5">
        <label htmlFor="address-line1" className="block text-[11px] uppercase tracking-wider font-medium text-foreground">
          Flat / House No. / Building / Street <span className="text-red-500">*</span>
        </label>
        <Input
          id="address-line1"
          type="text"
          value={addressLine1}
          onChange={(e) => {
            setAddressLine1(e.target.value);
            if (errors.addressLine1) setErrors((prev) => ({ ...prev, addressLine1: "" }));
          }}
          placeholder="e.g. 42 Atelier Boulevard, Bandra West"
          disabled={isSubmitting}
          aria-invalid={!!errors.addressLine1}
          className="h-9 text-xs"
        />
        {errors.addressLine1 && (
          <p className="text-[11px] text-red-600 dark:text-red-400">{errors.addressLine1}</p>
        )}
      </div>

      {/* Address Line 2 & Landmark */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="address-line2" className="block text-[11px] uppercase tracking-wider font-medium text-foreground">
            Area / Locality <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <Input
            id="address-line2"
            type="text"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder="e.g. Near Mehboob Studio"
            disabled={isSubmitting}
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="address-landmark" className="block text-[11px] uppercase tracking-wider font-medium text-foreground">
            Landmark <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <Input
            id="address-landmark"
            type="text"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="e.g. Opposite Art Gallery"
            disabled={isSubmitting}
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* City, State & PIN code */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="address-city" className="block text-[11px] uppercase tracking-wider font-medium text-foreground">
            City <span className="text-red-500">*</span>
          </label>
          <Input
            id="address-city"
            type="text"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              if (errors.city) setErrors((prev) => ({ ...prev, city: "" }));
            }}
            placeholder="e.g. Mumbai"
            disabled={isSubmitting}
            aria-invalid={!!errors.city}
            className="h-9 text-xs"
          />
          {errors.city && (
            <p className="text-[11px] text-red-600 dark:text-red-400">{errors.city}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="address-state" className="block text-[11px] uppercase tracking-wider font-medium text-foreground">
            State / UT <span className="text-red-500">*</span>
          </label>
          <select
            id="address-state"
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              if (errors.state) setErrors((prev) => ({ ...prev, state: "" }));
            }}
            disabled={isSubmitting}
            aria-invalid={!!errors.state}
            className="h-9 w-full rounded border border-input bg-surface px-3 text-xs tracking-wide focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:bg-neutral-900 dark:focus:ring-neutral-100"
          >
            {INDIA_STATES.map((s) => (
              <option key={s.code} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.state && (
            <p className="text-[11px] text-red-600 dark:text-red-400">{errors.state}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="address-pincode" className="block text-[11px] uppercase tracking-wider font-medium text-foreground">
            PIN Code <span className="text-red-500">*</span>
          </label>
          <Input
            id="address-pincode"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={postalCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
              setPostalCode(val);
              if (errors.postalCode) setErrors((prev) => ({ ...prev, postalCode: "" }));
            }}
            placeholder="400050"
            disabled={isSubmitting}
            aria-invalid={!!errors.postalCode}
            className="h-9 text-xs font-mono"
          />
          {errors.postalCode && (
            <p className="text-[11px] text-red-600 dark:text-red-400">{errors.postalCode}</p>
          )}
        </div>
      </div>

      {/* Address Type Selection */}
      <div className="space-y-2 pt-1">
        <span className="block text-[11px] uppercase tracking-wider font-medium text-foreground">
          Address Type
        </span>
        <div className="flex items-center gap-3">
          {[
            { value: AddressType.HOME, label: "Home" },
            { value: AddressType.WORK, label: "Work" },
            { value: AddressType.OTHER, label: "Other" },
          ].map((item) => (
            <label
              key={item.value}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs cursor-pointer transition-colors ${
                type === item.value
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-black font-medium"
                  : "border-border bg-card text-muted-foreground hover:border-neutral-400"
              }`}
            >
              <input
                type="radio"
                name="addressType"
                value={item.value}
                checked={type === item.value}
                onChange={() => setType(item.value)}
                disabled={isSubmitting}
                className="sr-only"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Default Address Checkbox */}
      <div className="pt-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            disabled={isSubmitting}
            className="h-4 w-4 rounded border-input text-neutral-900 focus:ring-neutral-900 dark:bg-neutral-900"
          />
          <span className="text-xs text-foreground">
            Set as default shipping address
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="text-xs px-5"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Saving Address...
            </>
          ) : initialData ? (
            "Update Address"
          ) : (
            "Save Address"
          )}
        </Button>
      </div>
    </form>
  );
}
