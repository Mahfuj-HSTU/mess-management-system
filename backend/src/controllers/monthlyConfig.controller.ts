import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { assertMonthlyManager } from "../lib/permissions";
import { MemberRole } from "@prisma/client";

// GET /api/monthly-config/:messId?month=&year=
export async function getMonthlyConfig(req: Request, res: Response) {
  const { messId } = req.params;
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year  = Number(req.query.year)  || new Date().getFullYear();

  const config = await prisma.monthlyConfig.findUnique({
    where: { messId_month_year: { messId, month, year } },
  });

  res.json({
    config: config ?? {
      messId, month, year,
      buaPerMember: 0,
      hasRamadan: false, ramadanStartDay: 15,
    },
  });
}

// PUT /api/monthly-config/:messId
export async function updateMonthlyConfig(req: Request, res: Response) {
  const { messId } = req.params;
  const { month, year, buaPerMember, hasRamadan, ramadanStartDay } = req.body;

  if (!month || !year) {
    res.status(400).json({ error: "month and year are required." });
    return;
  }

  if (req.memberRole !== MemberRole.SUPER_ADMIN) {
    const allowed = await assertMonthlyManager(messId, req.userId, Number(month), Number(year), res);
    if (!allowed) return;
  }

  const config = await prisma.monthlyConfig.upsert({
    where:  { messId_month_year: { messId, month: Number(month), year: Number(year) } },
    update: {
      ...(buaPerMember    !== undefined && { buaPerMember:    Number(buaPerMember) }),
      ...(hasRamadan      !== undefined && { hasRamadan:      Boolean(hasRamadan) }),
      ...(ramadanStartDay !== undefined && { ramadanStartDay: Number(ramadanStartDay) }),
    },
    create: {
      messId, month: Number(month), year: Number(year),
      buaPerMember:    Number(buaPerMember    ?? 0),
      hasRamadan:      Boolean(hasRamadan     ?? false),
      ramadanStartDay: Number(ramadanStartDay ?? 15),
    },
  });

  res.json({ config, message: "Monthly config updated." });
}
