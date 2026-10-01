"use client";

import * as React from "react";
import { Phone, Edit2, Trash2, Home, Briefcase, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddressDTO } from "@/modules/addresses/address.types";
import { AddressType } from "@/constants/status";

interface AddressCardProps {
  address: AddressDTO;
  isSelected?: boolean;
  onSelect?: (address: AddressDTO) => void;
  onEdit?: (address: AddressDTO) => void;
  onDelete?: (address: AddressDTO) => void;
  onSetDefault?: (address: AddressDTO) => void;
  isActionPending?: boolean;
  selectable?: boolean;
}

export function AddressCard({
  address,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  isActionPending = false,
  selectable = false,
}: AddressCardProps) {
  const getTypeIcon = () => {
    switch (address.type) {
      case AddressType.WORK:
        return <Briefcase className="h-3 w-3 mr-1 text-muted-foreground" />;
      case AddressType.OTHER:
        return <Tag className="h-3 w-3 mr-1 text-muted-foreground" />;
      case AddressType.HOME:
      default:
        return <Home className="h-3 w-3 mr-1 text-muted-foreground" />;
    }
  };

  return (
    <div
      onClick={() => selectable && onSelect && onSelect(address)}
      className={`relative rounded-md border p-5 transition-all duration-200 ${
        selectable ? "cursor-pointer" : ""
      } ${
        isSelected
          ? "border-neutral-900 bg-neutral-50/50 shadow-sm dark:border-neutral-100 dark:bg-neutral-900/50 ring-1 ring-neutral-900 dark:ring-neutral-100"
          : "border-border bg-card hover:border-neutral-400 dark:hover:border-neutral-600"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Header: Name & Badges */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {selectable && (
              <div
                className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                  isSelected
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-black"
                    : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white dark:bg-black" />}
              </div>
            )}
            <h3 className="font-serif text-base font-medium text-foreground tracking-wide">
              {address.fullName}
            </h3>
            <Badge variant="outline" className="text-[10px] tracking-wider uppercase font-sans">
              <span className="flex items-center">
                {getTypeIcon()}
                {address.type}
              </span>
            </Badge>
            {address.isDefault && (
              <Badge variant="secondary" className="text-[10px] tracking-wider uppercase font-sans bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700">
                Default Address
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Edit / Delete in non-selectable mode */}
        {!selectable && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(address);
                }}
                disabled={isActionPending}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                aria-label={`Edit address for ${address.fullName}`}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(address);
                }}
                disabled={isActionPending}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                aria-label={`Delete address for ${address.fullName}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Address Details */}
      <div className="mt-3 text-xs text-muted-foreground space-y-1 leading-relaxed">
        <p className="text-foreground/90 font-sans">
          {address.addressLine1}
          {address.addressLine2 ? `, ${address.addressLine2}` : ""}
        </p>
        {address.landmark && (
          <p className="text-muted-foreground text-[11px] italic">
            Landmark: {address.landmark}
          </p>
        )}
        <p className="text-foreground/90 font-sans">
          {address.city}, {address.state} — <span className="font-mono font-medium">{address.postalCode}</span>
        </p>
        <p className="text-muted-foreground text-[11px] uppercase tracking-wider">{address.country}</p>

        <div className="flex items-center gap-1.5 pt-2 text-[11px] text-foreground font-mono">
          <Phone className="h-3 w-3 text-neutral-400" />
          <span>{address.phone}</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
        {!address.isDefault && onSetDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSetDefault(address);
            }}
            disabled={isActionPending}
            className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground tracking-wider uppercase"
          >
            Set as Default
          </Button>
        )}

        {selectable && onEdit && (
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(address);
              }}
              disabled={isActionPending}
              className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              Edit
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(address);
                }}
                disabled={isActionPending}
                className="text-[11px] h-7 px-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
