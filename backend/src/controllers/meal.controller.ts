import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { assertMonthlyManager, monthYearFromDate } from "../lib/permissions";

// POST /api/meals/:messId — upsert meal for a member on a date
export async function addMeal(req: Request, res: Response) {
  const messId = req.params.messId;
  const {
    userId, date,
    breakfast = false, lunch = false, dinner = false,
    guestBreakfast = 0, guestLunch = 0, guestDinner = 0,
  } = req.body;

  if (!userId || !date) {
    res.status(400).json({ error: "userId and date are required." });
    return;
  }

  const { month, year } = monthYearFromDate(date);
  const allowed = await assertMonthlyManager(messId, req.userId, month, year, res);
  if (!allowed) return;

  const member = await prisma.messMember.findUnique({
    where: { messId_userId: { messId, userId } },
  });
  if (!member) {
    res.status(404).json({ error: "User is not a member of this mess." });
    return;
  }

  const config = await prisma.mealConfig.findUnique({ where: { messId } });
  const breakfastVal = config?.breakfast ?? 0;
  const lunchVal     = config?.lunch     ?? 1;
  const dinnerVal    = config?.dinner    ?? 1;

  const safeGB = Math.max(0, Math.floor(Number(guestBreakfast) || 0));
  const safeGL = Math.max(0, Math.floor(Number(guestLunch)     || 0));
  const safeGD = Math.max(0, Math.floor(Number(guestDinner)    || 0));

  // Each guest meal type follows the same config multiplier as the member meal
  const totalMeals =
    (breakfast ? breakfastVal : 0) +
    (lunch     ? lunchVal     : 0) +
    (dinner    ? dinnerVal    : 0) +
    safeGB * breakfastVal +
    safeGL * lunchVal +
    safeGD * dinnerVal;

  const meal = await prisma.meal.upsert({
    where:  { messId_userId_date: { messId, userId, date: new Date(date) } },
    update: {
      breakfast, lunch, dinner,
      guestBreakfast: safeGB, guestLunch: safeGL, guestDinner: safeGD,
      totalMeals, addedById: req.userId,
    },
    create: {
      messId, userId, date: new Date(date),
      breakfast, lunch, dinner,
      guestBreakfast: safeGB, guestLunch: safeGL, guestDinner: safeGD,
      totalMeals, addedById: req.userId,
    },
    include: { addedBy: { select: { name: true } } },
  });

  res.status(201).json({ meal });
}

// GET /api/meals/:messId?month=&year=
export async function getMeals(req: Request, res: Response) {
  const messId = req.params.messId;
  const month  = Number(req.query.month) || new Date().getMonth() + 1;
  const year   = Number(req.query.year)  || new Date().getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0);

  const [meals, members] = await Promise.all([
    prisma.meal.findMany({
      where:   { messId, date: { gte: startDate, lte: endDate } },
      include: { addedBy: { select: { id: true, name: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.messMember.findMany({
      where:   { messId, isMember: true },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  const summary = members.map((m) => {
    const mm = meals.filter((meal) => meal.userId === m.userId);
    return {
      userId:           m.userId,
      name:             m.user.name,
      role:             m.role,
      totalBreakfast:   mm.filter((meal) => meal.breakfast).length,
      totalLunch:       mm.filter((meal) => meal.lunch).length,
      totalDinner:      mm.filter((meal) => meal.dinner).length,
      totalGuestBreakfast: mm.reduce((s, meal) => s + (meal.guestBreakfast || 0), 0),
      totalGuestLunch:     mm.reduce((s, meal) => s + (meal.guestLunch     || 0), 0),
      totalGuestDinner:    mm.reduce((s, meal) => s + (meal.guestDinner    || 0), 0),
      totalMeals:       mm.reduce((s, meal) => s + meal.totalMeals, 0),
    };
  });

  res.json({ meals, summary });
}

// DELETE /api/meals/:messId/:mealId
export async function deleteMeal(req: Request, res: Response) {
  const { messId, mealId } = req.params;

  const meal = await prisma.meal.findUnique({ where: { id: mealId } });
  if (!meal || meal.messId !== messId) {
    res.status(404).json({ error: "Meal not found." });
    return;
  }

  const { month, year } = monthYearFromDate(meal.date.toISOString());
  const allowed = await assertMonthlyManager(messId, req.userId, month, year, res);
  if (!allowed) return;

  await prisma.meal.delete({ where: { id: mealId } });
  res.json({ message: "Meal deleted." });
}
