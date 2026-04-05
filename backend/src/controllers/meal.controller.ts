import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

function calcTotal(breakfast: boolean, lunch: boolean, dinner: boolean): number {
  // breakfast = 0.5 meal, lunch = 1, dinner = 1
  return (breakfast ? 0.5 : 0) + (lunch ? 1 : 0) + (dinner ? 1 : 0);
}

// POST /api/meals/:messId
export async function addMeal(req: Request, res: Response) {
  const { userId, date, breakfast = false, lunch = false, dinner = false } = req.body;
  const messId = req.params.messId;

  if (!userId || !date) {
    res.status(400).json({ error: "userId and date are required." });
    return;
  }

  // Ensure target user is a member
  const member = await prisma.messMember.findUnique({
    where: { messId_userId: { messId, userId } },
  });
  if (!member) {
    res.status(404).json({ error: "User is not a member of this mess." });
    return;
  }

  const totalMeals = calcTotal(breakfast, lunch, dinner);
  const mealDate = new Date(date);

  const meal = await prisma.meal.upsert({
    where: { messId_userId_date: { messId, userId, date: mealDate } },
    update: { breakfast, lunch, dinner, totalMeals, addedById: req.userId },
    create: {
      messId,
      userId,
      date: mealDate,
      breakfast,
      lunch,
      dinner,
      totalMeals,
      addedById: req.userId,
    },
    include: { addedBy: { select: { name: true } } },
  });

  res.status(201).json({ meal });
}

// GET /api/meals/:messId?month=&year=
export async function getMeals(req: Request, res: Response) {
  const messId = req.params.messId;
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // last day of month

  const meals = await prisma.meal.findMany({
    where: {
      messId,
      date: { gte: startDate, lte: endDate },
    },
    include: {
      addedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "asc" }],
  });

  // Get member info for context
  const members = await prisma.messMember.findMany({
    where: { messId },
    include: { user: { select: { id: true, name: true } } },
  });

  // Build summary per member
  const summary = members.map((m) => {
    const memberMeals = meals.filter((meal) => meal.userId === m.userId);
    const totalBreakfast = memberMeals.filter((meal) => meal.breakfast).length;
    const totalLunch = memberMeals.filter((meal) => meal.lunch).length;
    const totalDinner = memberMeals.filter((meal) => meal.dinner).length;
    const totalMeals = memberMeals.reduce((sum, meal) => sum + meal.totalMeals, 0);
    return {
      userId: m.userId,
      name: m.user.name,
      role: m.role,
      totalBreakfast,
      totalLunch,
      totalDinner,
      totalMeals,
    };
  });

  res.json({ meals, summary });
}

// GET /api/meals/:messId/member/:userId?month=&year=
export async function getMemberMeals(req: Request, res: Response) {
  const { messId, userId } = req.params;
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const meals = await prisma.meal.findMany({
    where: {
      messId,
      userId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
  });

  const totalMeals = meals.reduce((sum, m) => sum + m.totalMeals, 0);

  res.json({ meals, totalMeals });
}

// DELETE /api/meals/:messId/:mealId
export async function deleteMeal(req: Request, res: Response) {
  const { messId, mealId } = req.params;

  const meal = await prisma.meal.findUnique({ where: { id: mealId } });
  if (!meal || meal.messId !== messId) {
    res.status(404).json({ error: "Meal not found." });
    return;
  }

  await prisma.meal.delete({ where: { id: mealId } });
  res.json({ message: "Meal deleted." });
}
