import { Response } from "express";
import { prisma } from "./prisma";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

/**
 * Returns true if userId is the assigned monthly manager for the given
 * messId + month + year. Sends a 403 and returns false if not.
 */
export async function assertMonthlyManager(
  messId: string,
  userId: string,
  month: number,
  year: number,
  res: Response
): Promise<boolean> {
  const record = await prisma.monthlyManager.findUnique({
    where: { messId_month_year: { messId, month, year } },
  });

  if (!record || record.userId !== userId) {
    res.status(403).json({
      error: `Only the manager for ${MONTH_NAMES[month - 1]} ${year} can perform this action.`,
    });
    return false;
  }
  return true;
}

/** Extract month+year from a date string. */
export function monthYearFromDate(dateStr: string): { month: number; year: number } {
  const d = new Date(dateStr);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}
