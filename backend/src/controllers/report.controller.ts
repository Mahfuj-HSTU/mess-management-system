import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { MemberRole } from "@prisma/client";
import { sendDueReminderEmail } from "../lib/email";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// GET /api/reports/:messId/monthly?month=&year=
export async function getMonthlyReport(req: Request, res: Response) {
  const messId = req.params.messId;
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // All members
  const members = await prisma.messMember.findMany({
    where: { messId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });

  // All meals this month
  const meals = await prisma.meal.findMany({
    where: { messId, date: { gte: startDate, lte: endDate } },
  });

  // All bazaar this month
  const bazaars = await prisma.bazaar.findMany({
    where: { messId, date: { gte: startDate, lte: endDate } },
  });

  // All payments this month
  const payments = await prisma.payment.findMany({
    where: { messId, date: { gte: startDate, lte: endDate } },
  });

  const totalBazaarCost = bazaars.reduce((sum, b) => sum + b.amount, 0);
  const totalMeals = meals.reduce((sum, m) => sum + m.totalMeals, 0);
  const mealRate = totalMeals > 0 ? totalBazaarCost / totalMeals : 0;

  const memberReports = members.map((m) => {
    const memberMeals = meals
      .filter((meal) => meal.userId === m.userId)
      .reduce((sum, meal) => sum + meal.totalMeals, 0);

    const memberPaid = payments
      .filter((p) => p.memberId === m.userId)
      .reduce((sum, p) => sum + p.amount, 0);

    const mealCost = memberMeals * mealRate;
    const due = mealCost - memberPaid; // positive = owes, negative = advance

    return {
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      totalMeals: memberMeals,
      mealCost: Number(mealCost.toFixed(2)),
      totalPaid: memberPaid,
      due: Number(due.toFixed(2)),
    };
  });

  res.json({
    month,
    year,
    monthName: MONTH_NAMES[month - 1],
    totalBazaarCost: Number(totalBazaarCost.toFixed(2)),
    totalMeals: Number(totalMeals.toFixed(2)),
    mealRate: Number(mealRate.toFixed(2)),
    memberReports,
  });
}

// POST /api/reports/:messId/send-reminders
export async function sendDueReminders(req: Request, res: Response) {
  const messId = req.params.messId;
  const month = Number(req.body.month) || new Date().getMonth() + 1;
  const year = Number(req.body.year) || new Date().getFullYear();

  if (
    req.memberRole !== MemberRole.MANAGER &&
    req.memberRole !== MemberRole.SUPER_ADMIN
  ) {
    res.status(403).json({ error: "Only the manager can send reminders." });
    return;
  }

  const mess = await prisma.mess.findUnique({ where: { id: messId } });
  if (!mess) {
    res.status(404).json({ error: "Mess not found." });
    return;
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const members = await prisma.messMember.findMany({
    where: { messId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const meals = await prisma.meal.findMany({
    where: { messId, date: { gte: startDate, lte: endDate } },
  });
  const bazaars = await prisma.bazaar.findMany({
    where: { messId, date: { gte: startDate, lte: endDate } },
  });
  const payments = await prisma.payment.findMany({
    where: { messId, date: { gte: startDate, lte: endDate } },
  });

  const totalBazaarCost = bazaars.reduce((sum, b) => sum + b.amount, 0);
  const totalMeals = meals.reduce((sum, m) => sum + m.totalMeals, 0);
  const mealRate = totalMeals > 0 ? totalBazaarCost / totalMeals : 0;

  const emailResults: { name: string; email: string; due: number; sent: boolean }[] = [];

  for (const m of members) {
    const memberMeals = meals
      .filter((meal) => meal.userId === m.userId)
      .reduce((sum, meal) => sum + meal.totalMeals, 0);
    const memberPaid = payments
      .filter((p) => p.memberId === m.userId)
      .reduce((sum, p) => sum + p.amount, 0);
    const due = memberMeals * mealRate - memberPaid;

    if (due > 0) {
      try {
        await sendDueReminderEmail({
          to: m.user.email,
          name: m.user.name,
          dueAmount: due,
          messName: mess.name,
          month: MONTH_NAMES[month - 1],
          year,
        });
        emailResults.push({ name: m.user.name, email: m.user.email, due, sent: true });
      } catch {
        emailResults.push({ name: m.user.name, email: m.user.email, due, sent: false });
      }
    }
  }

  res.json({ message: "Reminders sent.", results: emailResults });
}

// GET /api/reports/:messId/history
export async function getReportHistory(req: Request, res: Response) {
  const messId = req.params.messId;

  // Get distinct months from bazaar data
  const bazaars = await prisma.bazaar.findMany({
    where: { messId },
    select: { date: true },
    orderBy: { date: "desc" },
  });

  const months = new Set<string>();
  bazaars.forEach((b) => {
    const d = new Date(b.date);
    months.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
  });

  const history = Array.from(months).map((key) => {
    const [year, month] = key.split("-").map(Number);
    return { year, month, monthName: MONTH_NAMES[month - 1] };
  });

  res.json({ history });
}
