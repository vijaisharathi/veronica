"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { SizeMeasurement } from "@/types/storefront";

export interface SizeChartDialogProps {
  isOpen: boolean;
  onClose: () => void;
  measurements?: SizeMeasurement[];
}

export function SizeChartDialog({
  isOpen,
  onClose,
  measurements = [
    { size: "XS / 36", chest: "36 in (91 cm)", waist: "30 in (76 cm)", length: "29 in (74 cm)" },
    { size: "S / 38", chest: "38 in (96 cm)", waist: "32 in (81 cm)", length: "29.5 in (75 cm)" },
    { size: "M / 40", chest: "40 in (101 cm)", waist: "34 in (86 cm)", length: "30 in (76 cm)" },
    { size: "L / 42", chest: "42 in (106 cm)", waist: "36 in (91 cm)", length: "30.5 in (77 cm)" },
    { size: "XL / 44", chest: "44 in (111 cm)", waist: "38 in (96 cm)", length: "31 in (78 cm)" },
    { size: "XXL / 46", chest: "46 in (116 cm)", waist: "40 in (101 cm)", length: "31.5 in (80 cm)" },
  ],
}: SizeChartDialogProps) {
  const [unit, setUnit] = React.useState<"in" | "cm">("in");

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Atelier Garment Measurements"
      description="All measurements are taken with the garment laid flat. Standard Indian and European sizing matrix."
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Unit Selector */}
        <div className="flex items-center justify-end gap-2 text-xs">
          <span className="text-muted-foreground font-mono uppercase">Unit:</span>
          <div className="inline-flex rounded border border-border p-0.5 bg-neutral-50 dark:bg-neutral-800">
            <button
              type="button"
              onClick={() => setUnit("in")}
              className={`px-2.5 py-1 text-xs font-mono rounded ${
                unit === "in" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold" : "text-neutral-600"
              }`}
            >
              Inches
            </button>
            <button
              type="button"
              onClick={() => setUnit("cm")}
              className={`px-2.5 py-1 text-xs font-mono rounded ${
                unit === "cm" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold" : "text-neutral-600"
              }`}
            >
              Centimeters
            </button>
          </div>
        </div>

        {/* Measurement Table */}
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-b border-border">
              <tr>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider">Garment Size</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider">Chest / Bust</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider">Waist</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider">Garment Length</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {measurements.map((row, idx) => (
                <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                  <td className="py-2.5 px-4 font-mono font-medium">{row.size}</td>
                  <td className="py-2.5 px-4 text-neutral-600 dark:text-neutral-400">
                    {unit === "in" ? row.chest.split("(")[0]?.trim() : row.chest.split("(")[1]?.replace(")", "").trim()}
                  </td>
                  <td className="py-2.5 px-4 text-neutral-600 dark:text-neutral-400">
                    {unit === "in" ? row.waist.split("(")[0]?.trim() : row.waist.split("(")[1]?.replace(")", "").trim()}
                  </td>
                  <td className="py-2.5 px-4 text-neutral-600 dark:text-neutral-400">
                    {unit === "in" ? row.length.split("(")[0]?.trim() : row.length.split("(")[1]?.replace(")", "").trim()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* How to Measure Guidance */}
        <div className="rounded-lg bg-neutral-50 p-4 border border-border/80 text-[11px] text-muted-foreground space-y-1 dark:bg-neutral-800/60">
          <span className="font-semibold text-foreground uppercase tracking-wider block">
            How to measure:
          </span>
          <p>• <strong>Chest:</strong> Measure across the fullest part of your chest, keeping the tape level under your arms.</p>
          <p>• <strong>Waist:</strong> Measure around your natural waistline, keeping the tape comfortably loose.</p>
          <p>• <strong>Length:</strong> Measured from the highest point of the shoulder down to the garment hem.</p>
        </div>
      </div>
    </Dialog>
  );
}
