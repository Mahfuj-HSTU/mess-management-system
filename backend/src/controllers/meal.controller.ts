import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { assertMonthlyManager, monthYearFromDate } from "../lib/permissions";

// POST /api/meals/:messId
export async function addMeal(req: Request, res: Response) {
  const messId = req.params.messId;
  const { userId, date, breakfast = false, lunch = false, dinner = false } = req.body;

  if (!userId || !date) {
    res.status(400).json({ error: "userId and date are required." });
    return;
  }

  // Only the monthly manager for that date's month can add meals
  const { month, year } = monthYearFromDate(date);
  const allowed = await assertMonthlyManager(messId, req.userId, month, year, res);
  if (!allowed) return;

  // Target user must be a mess member
  const member = await prisma.messMember.findUnique({
    where: { messId_userId: { messId, userId } },
  });
  if (!member) {
    res.status(404).json({ error: "User is not a member of this mess." });
    return;
  }

  // Get meal config to calculate the correct meal count
  const config = await prisma.mealConfig.findUnique({ where: { messId } });
  const breakfastVal = config?.breakfast ?? 0;
  const lunchVal     = config?.lunch     ?? 1;
  const dinnerVal    = config?.dinner    ?? 1;

  const totalMeals =
    (breakfast ? breakfastVal : 0) +
    (lunch     ? lunchVal     : 0) +
    (dinner    ? dinnerVal    : 0);

  const meal = await prisma.meal.upsert({
    where:  { messId_userId_date: { messId, userId, date: new Date(date) } },
    update: { breakfast, lunch, dinner, totalMeals, addedById: req.userId },
    create: { messId, userId, date: new Date(date), breakfast, lunch, dinner, totalMeals, addedById: req.userId },
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
      where:   { messId },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  // Build per-member summary
  const summary = members.map((m) => {
    const memberMeals = meals.filter((meal) => meal.userId === m.userId);
    return {
      userId:         m.userId,
      name:           m.user.name,
      role:           m.role,
      totalBreakfast: memberMeals.filter((meal) => meal.breakfast).length,
      totalLunch:     memberMeals.filter((meal) => meal.lunch).length,
      totalDinner:    memberMeals.filter((meal) => meal.dinner).length,
      totalMeals:     memberMeals.reduce((sum, meal) => sum + meal.totalMeals, 0),
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

  // Check monthly manager permission for the meal's date
  const { month, year } = monthYearFromDate(meal.date.toISOString());
  const allowed = await assertMonthlyManager(messId, req.userId, month, year, res);
  if (!allowed) return;

  await prisma.meal.delete({ where: { id: mealId } });
  res.json({ message: "Meal deleted." });
}
