import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { MemberRole } from "@prisma/client";
import { sendDueReminderEmail } from "../lib/email";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// GET /api/reports/:messId/monthly?month=&year=
export async function getMonthlyReport(req: Request, res: Response) {
  const messId = req.params.messId;
  const month  = Number(req.query.month) || new Date().getMonth() + 1;
  const year   = Number(req.query.year)  || new Date().getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0);

  const [members, meals, bazaars, payments, monthlyManager] = await Promise.all([
    prisma.messMember.findMany({
      where:   { messId, isMember: true },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.meal.findMany({
      where: { messId, date: { gte: startDate, lte: endDate } },
    }),
    prisma.bazaar.findMany({
      where: { messId, date: { gte: startDate, lte: endDate } },
    }),
    prisma.payment.findMany({
      where: { messId, date: { gte: startDate, lte: endDate } },
    }),
    prisma.monthlyManager.findUnique({
      where:   { messId_month_year: { messId, month, year } },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const totalBazaarCost = bazaars.reduce((sum, b) => sum + b.amount, 0);
  const totalMeals      = meals.reduce((sum, m) => sum + m.totalMeals, 0);
  const mealRate        = totalMeals > 0 ? totalBazaarCost / totalMeals : 0;

  const memberReports = members.map((m) => {
    const memberMeals = meals
      .filter((meal) => meal.userId === m.userId)
      .reduce((sum, meal) => sum + meal.totalMeals, 0);

    const memberPaid = payments
      .filter((p) => p.memberId === m.userId)
      .reduce((sum, p) => sum + p.amount, 0);

    const mealCost = memberMeals * mealRate;
    const due      = mealCost - memberPaid;

    return {
      userId:     m.userId,
      name:       m.user.name,
      email:      m.user.email,
      role:       m.role,
      totalMeals: Number(memberMeals.toFixed(2)),
      mealCost:   Number(mealCost.toFixed(2)),
      totalPaid:  memberPaid,
      due:        Number(due.toFixed(2)),
    };
  });

  res.json({
    month,
    year,
    monthName:        MONTH_NAMES[month - 1],
    totalBazaarCost:  Number(totalBazaarCost.toFixed(2)),
    totalMeals:       Number(totalMeals.toFixed(2)),
    mealRate:         Number(mealRate.toFixed(2)),
    monthlyManager:   monthlyManager ?? null,
    memberReports,
  });
}

// GET /api/reports/:messId/history
export async function getReportHistory(req: Request, res: Response) {
  const messId = req.params.messId;

  const bazaars = await prisma.bazaar.findMany({
    where:  { messId },
    select: { date: true },
    orderBy: { date: "desc" },
  });

  const seen    = new Set<string>();
  const history: { year: number; month: number; monthName: string }[] = [];

  for (const b of bazaars) {
    const d   = new Date(b.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (!seen.has(key)) {
      seen.add(key);
      history.push({
        year:      d.getFullYear(),
        month:     d.getMonth() + 1,
        monthName: MONTH_NAMES[d.getMonth()],
      });
    }
  }

  res.json({ history });
}

// POST /api/reports/:messId/send-reminders
// Only the monthly manager or super admin can send reminders.
export async function sendDueReminders(req: Request, res: Response) {
  const messId = req.params.messId;
  const month  = Number(req.body.month) || new Date().getMonth() + 1;
  const year   = Number(req.body.year)  || new Date().getFullYear();

  // Permission: must be monthly manager for that month OR super admin
  if (req.memberRole !== MemberRole.SUPER_ADMIN) {
    const record = await prisma.monthlyManager.findUnique({
      where: { messId_month_year: { messId, month, year } },
    });
    if (!record || record.userId !== req.userId) {
      res.status(403).json({ error: "Only the monthly manager can send reminders." });
      return;
    }
  }

  const mess = await prisma.mess.findUnique({ where: { id: messId } });
  if (!mess) {
    res.status(404).json({ error: "Mess not found." });
    return;
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0);

  const [members, meals, bazaars, payments] = await Promise.all([
    prisma.messMember.findMany({
      where:   { messId, isMember: true },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.meal.findMany({ where: { messId, date: { gte: startDate, lte: endDate } } }),
    prisma.bazaar.findMany({ where: { messId, date: { gte: startDate, lte: endDate } } }),
    prisma.payment.findMany({ where: { messId, date: { gte: startDate, lte: endDate } } }),
  ]);

  const totalBazaarCost = bazaars.reduce((sum, b) => sum + b.amount, 0);
  const totalMeals      = meals.reduce((sum, m) => sum + m.totalMeals, 0);
  const mealRate        = totalMeals > 0 ? totalBazaarCost / totalMeals : 0;

  const results: { name: string; email: string; due: number; sent: boolean }[] = [];

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
          to:        m.user.email,
          name:      m.user.name,
          dueAmount: due,
          messName:  mess.name,
          month:     MONTH_NAMES[month - 1],
          year,
        });
        results.push({ name: m.user.name, email: m.user.email, due, sent: true });
      } catch {
        results.push({ name: m.user.name, email: m.user.email, due, sent: false });
      }
    }
  }

  res.json({ message: "Reminders processed.", results });
}
