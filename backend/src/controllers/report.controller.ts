import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { MemberRole } from "@prisma/client";
import { sendDueReminderEmail } from "../lib/email";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Core calculation ─────────────────────────────────────────────────────────

function buildReport(
  members:    { userId: string; user: { id: string; name: string; email: string } }[],
  meals:      { userId: string; totalMeals: number; date: Date }[],
  bazaars:    { amount: number; date: Date }[],
  payments:   { memberId: string; amount: number; fixedAmount: number }[],
  extraCosts: { amount: number }[],
  cfg: { buaPerMember: number; hasRamadan: boolean; ramadanStartDay: number } | null,
) {
  const config = cfg ?? { buaPerMember: 0, hasRamadan: false, ramadanStartDay: 15 };

  const memberCount    = members.length;
  const totalExtraCosts = extraCosts.reduce((s, c) => s + c.amount, 0);
  const extraPerMember  = memberCount > 0 ? totalExtraCosts / memberCount : 0;

  // Fixed charge = bua (per member, same for all) + extra (split equally)
  const fixedChargePerMember = config.buaPerMember + extraPerMember;

  // ── Meal rates ────────────────────────────────────────────────────────────
  let globalMealRate = 0;
  let period1: { totalBazaar: number; totalMeals: number; mealRate: number } | null = null;
  let period2: { totalBazaar: number; totalMeals: number; mealRate: number } | null = null;

  if (config.hasRamadan) {
    const split = config.ramadanStartDay;
    const b1 = bazaars.filter((b) => new Date(b.date).getDate() <  split);
    const b2 = bazaars.filter((b) => new Date(b.date).getDate() >= split);
    const m1 = meals.filter((m)   => new Date(m.date).getDate() <  split);
    const m2 = meals.filter((m)   => new Date(m.date).getDate() >= split);
    const tb1 = b1.reduce((s, b) => s + b.amount, 0);
    const tm1 = m1.reduce((s, m) => s + m.totalMeals, 0);
    const tb2 = b2.reduce((s, b) => s + b.amount, 0);
    const tm2 = m2.reduce((s, m) => s + m.totalMeals, 0);
    period1 = { totalBazaar: tb1, totalMeals: tm1, mealRate: tm1 > 0 ? tb1 / tm1 : 0 };
    period2 = { totalBazaar: tb2, totalMeals: tm2, mealRate: tm2 > 0 ? tb2 / tm2 : 0 };
  } else {
    const totalBazaar = bazaars.reduce((s, b) => s + b.amount, 0);
    const totalMeals  = meals.reduce((s, m) => s + m.totalMeals, 0);
    globalMealRate = totalMeals > 0 ? totalBazaar / totalMeals : 0;
  }

  const totalBazaarCost = bazaars.reduce((s, b) => s + b.amount, 0);
  const totalMeals      = meals.reduce((s, m) => s + m.totalMeals, 0);
  const overallMealRate = config.hasRamadan
    ? (totalMeals > 0 ? totalBazaarCost / totalMeals : 0)
    : globalMealRate;

  // ── Per-member report ─────────────────────────────────────────────────────
  const memberReports = members.map((m) => {
    // Separate the meal vs fixed portions of what the member actually paid
    const memberPayments  = payments.filter((p) => p.memberId === m.userId);
    const totalPaid       = memberPayments.reduce((s, p) => s + p.amount, 0);
    const fixedPaid       = memberPayments.reduce((s, p) => s + (p.fixedAmount || 0), 0);
    const mealPaid        = totalPaid - fixedPaid; // what went toward meals

    // Meal cost calculation
    let mealCost  = 0;
    let p1Meals   = 0;
    let p2Meals   = 0;

    if (config.hasRamadan && period1 && period2) {
      const split = config.ramadanStartDay;
      p1Meals = meals
        .filter((meal) => meal.userId === m.userId && new Date(meal.date).getDate() < split)
        .reduce((s, meal) => s + meal.totalMeals, 0);
      p2Meals = meals
        .filter((meal) => meal.userId === m.userId && new Date(meal.date).getDate() >= split)
        .reduce((s, meal) => s + meal.totalMeals, 0);
      mealCost = p1Meals * period1.mealRate + p2Meals * period2.mealRate;
    } else {
      p1Meals  = meals.filter((meal) => meal.userId === m.userId).reduce((s, m) => s + m.totalMeals, 0);
      mealCost = p1Meals * globalMealRate;
    }

    const totalMealsMember = p1Meals + p2Meals;

    // Dues — tracked independently, NOT subtracted from each other
    const mealDue  = mealCost - mealPaid;                     // positive = owes for meals
    const fixedDue = fixedChargePerMember - fixedPaid;        // positive = owes for bua+extra
    const netDue   = mealDue + fixedDue;                      // overall balance

    return {
      userId:      m.userId,
      name:        m.user.name,
      email:       m.user.email,
      // Meals
      period1Meals:  Number(p1Meals.toFixed(2)),
      period2Meals:  Number(p2Meals.toFixed(2)),
      totalMeals:    Number(totalMealsMember.toFixed(2)),
      mealCost:      Number(mealCost.toFixed(2)),
      // Payments
      totalPaid,
      mealPaid:      Number(mealPaid.toFixed(2)),
      fixedPaid:     Number(fixedPaid.toFixed(2)),
      fixedCharge:   Number(fixedChargePerMember.toFixed(2)),
      // Dues
      mealDue:       Number(mealDue.toFixed(2)),
      fixedDue:      Number(fixedDue.toFixed(2)),
      managerGets:   Number(Math.max(0, netDue).toFixed(2)),
      memberGets:    Number(Math.max(0, -netDue).toFixed(2)),
      due:           Number(netDue.toFixed(2)),
    };
  });

  return {
    totalBazaarCost: Number(totalBazaarCost.toFixed(2)),
    totalMeals:      Number(totalMeals.toFixed(2)),
    mealRate:        Number(overallMealRate.toFixed(2)),
    buaPerMember:    Number(config.buaPerMember.toFixed(2)),
    totalBuaBill:    Number((config.buaPerMember * memberCount).toFixed(2)),
    totalExtraCosts: Number(totalExtraCosts.toFixed(2)),
    extraPerMember:  Number(extraPerMember.toFixed(2)),
    fixedChargePerMember: Number(fixedChargePerMember.toFixed(2)),
    hasRamadan:      config.hasRamadan,
    ramadanStartDay: config.ramadanStartDay,
    period1: period1 ? {
      totalBazaar: Number(period1.totalBazaar.toFixed(2)),
      totalMeals:  Number(period1.totalMeals.toFixed(2)),
      mealRate:    Number(period1.mealRate.toFixed(4)),
    } : null,
    period2: period2 ? {
      totalBazaar: Number(period2.totalBazaar.toFixed(2)),
      totalMeals:  Number(period2.totalMeals.toFixed(2)),
      mealRate:    Number(period2.mealRate.toFixed(4)),
    } : null,
    memberReports,
  };
}

// GET /api/reports/:messId/monthly?month=&year=
export async function getMonthlyReport(req: Request, res: Response) {
  const messId = req.params.messId;
  const month  = Number(req.query.month) || new Date().getMonth() + 1;
  const year   = Number(req.query.year)  || new Date().getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0);

  const [members, meals, bazaars, payments, monthlyManager, monthlyConfig, extraCosts] =
    await Promise.all([
      prisma.messMember.findMany({
        where:   { messId, isMember: true },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      }),
      prisma.meal.findMany({ where: { messId, date: { gte: startDate, lte: endDate } } }),
      prisma.bazaar.findMany({ where: { messId, date: { gte: startDate, lte: endDate } } }),
      prisma.payment.findMany({ where: { messId, date: { gte: startDate, lte: endDate } } }),
      prisma.monthlyManager.findUnique({
        where:   { messId_month_year: { messId, month, year } },
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.monthlyConfig.findUnique({ where: { messId_month_year: { messId, month, year } } }),
      prisma.extraCost.findMany({ where: { messId, month, year } }),
    ]);

  const computed = buildReport(members, meals, bazaars, payments, extraCosts, monthlyConfig);

  res.json({
    month,
    year,
    monthName:      MONTH_NAMES[month - 1],
    monthlyManager: monthlyManager ?? null,
    ...computed,
  });
}

// GET /api/reports/:messId/history
export async function getReportHistory(req: Request, res: Response) {
  const messId = req.params.messId;

  const bazaars = await prisma.bazaar.findMany({
    where:   { messId },
    select:  { date: true },
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
export async function sendDueReminders(req: Request, res: Response) {
  const messId = req.params.messId;
  const month  = Number(req.body.month) || new Date().getMonth() + 1;
  const year   = Number(req.body.year)  || new Date().getFullYear();

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
  if (!mess) { res.status(404).json({ error: "Mess not found." }); return; }

  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0);

  const [members, meals, bazaars, payments, monthlyConfig, extraCosts] = await Promise.all([
    prisma.messMember.findMany({
      where:   { messId, isMember: true },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.meal.findMany({ where: { messId, date: { gte: startDate, lte: endDate } } }),
    prisma.bazaar.findMany({ where: { messId, date: { gte: startDate, lte: endDate } } }),
    prisma.payment.findMany({ where: { messId, date: { gte: startDate, lte: endDate } } }),
    prisma.monthlyConfig.findUnique({ where: { messId_month_year: { messId, month, year } } }),
    prisma.extraCost.findMany({ where: { messId, month, year } }),
  ]);

  const { memberReports } = buildReport(members, meals, bazaars, payments, extraCosts, monthlyConfig);
  const results: { name: string; email: string; due: number; sent: boolean }[] = [];

  for (const m of memberReports) {
    if (m.managerGets > 0) {
      try {
        await sendDueReminderEmail({
          to: m.email, name: m.name, dueAmount: m.managerGets,
          messName: mess.name, month: MONTH_NAMES[month - 1], year,
        });
        results.push({ name: m.name, email: m.email, due: m.managerGets, sent: true });
      } catch {
        results.push({ name: m.name, email: m.email, due: m.managerGets, sent: false });
      }
    }
  }

  res.json({ message: "Reminders processed.", results });
}
