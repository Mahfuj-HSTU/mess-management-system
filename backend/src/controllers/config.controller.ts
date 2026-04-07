import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { assertMonthlyManager } from "../lib/permissions";

// GET /api/config/:messId
// Any member can view the meal config.
export async function getMealConfig(req: Request, res: Response) {
  const config = await prisma.mealConfig.findUnique({
    where: { messId: req.params.messId },
  });

  // Return defaults if not set yet
  res.json({
    config: config ?? { breakfast: 0, lunch: 1, dinner: 1 },
  });
}

// PUT /api/config/:messId
// Only the monthly manager for the current month can update meal config.
export async function updateMealConfig(req: Request, res: Response) {
  const messId = req.params.messId;
  const { breakfast, lunch, dinner, month, year } = req.body;

  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year)  || new Date().getFullYear();

  const allowed = await assertMonthlyManager(messId, req.userId, m, y, res);
  if (!allowed) return;

  if (lunch === undefined || dinner === undefined) {
    res.status(400).json({ error: "lunch and dinner values are required." });
    return;
  }

  const lunchVal     = Number(lunch);
  const dinnerVal    = Number(dinner);
  const breakfastVal = Number(breakfast ?? 0); // 0 = disabled by default

  if (lunchVal <= 0 || dinnerVal <= 0) {
    res.status(400).json({ error: "lunch and dinner values must be greater than 0." });
    return;
  }
  if (breakfastVal < 0) {
    res.status(400).json({ error: "breakfast value cannot be negative." });
    return;
  }

  const config = await prisma.mealConfig.upsert({
    where:  { messId },
    update: { breakfast: breakfastVal, lunch: lunchVal, dinner: dinnerVal, updatedById: req.userId },
    create: { messId, breakfast: breakfastVal, lunch: lunchVal, dinner: dinnerVal, updatedById: req.userId },
  });

  res.json({ config });
}
