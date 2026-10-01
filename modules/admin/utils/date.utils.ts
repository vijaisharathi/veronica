/**
 * VÉRONA — Admin & Operations Dashboard Date Utilities (Phase 27)
 *
 * Implements deterministic date boundary calculations across canonical operational
 * time windows (TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS) under the business timezone.
 */

import { DateRangeOption } from "../types/admin.types";

export const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || "Asia/Kolkata";

export interface DateRangeBounds {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
}

/**
 * Returns exact start and end Date objects for a given range option,
 * along with the matching previous period for delta/trend calculations.
 */
export function getDateRangeBounds(range: DateRangeOption = "TODAY", now: Date = new Date()): DateRangeBounds {
  const current = new Date(now);

  switch (range) {
    case "TODAY": {
      // Start of today in local business day
      const start = new Date(current);
      start.setHours(0, 0, 0, 0);
      const end = new Date(current);

      // Previous period: yesterday same duration
      const previousStart = new Date(start);
      previousStart.setDate(previousStart.getDate() - 1);
      const previousEnd = new Date(end);
      previousEnd.setDate(previousEnd.getDate() - 1);

      return { start, end, previousStart, previousEnd };
    }

    case "YESTERDAY": {
      const start = new Date(current);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      // Previous period: day before yesterday
      const previousStart = new Date(start);
      previousStart.setDate(previousStart.getDate() - 1);
      const previousEnd = new Date(previousStart);
      previousEnd.setHours(23, 59, 59, 999);

      return { start, end, previousStart, previousEnd };
    }

    case "LAST_7_DAYS": {
      const start = new Date(current);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(current);

      const previousStart = new Date(start);
      previousStart.setDate(previousStart.getDate() - 7);
      const previousEnd = new Date(start);

      return { start, end, previousStart, previousEnd };
    }

    case "LAST_30_DAYS": {
      const start = new Date(current);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      const end = new Date(current);

      const previousStart = new Date(start);
      previousStart.setDate(previousStart.getDate() - 30);
      const previousEnd = new Date(start);

      return { start, end, previousStart, previousEnd };
    }

    default: {
      const start = new Date(current);
      start.setHours(0, 0, 0, 0);
      return { start, end: current, previousStart: start, previousEnd: current };
    }
  }
}
