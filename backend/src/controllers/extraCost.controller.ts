import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { assertMonthlyManager } from "../lib/permissions";
import { MemberRole } from "@prisma/client";

// GET /api/extra-costs/:messId?month=&year=
export async function getExtraCosts(req: Request, res: Response) {
  const { messId } = req.params;
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year  = Number(req.query.year)  || new Date().getFullYear();

  const costs = await prisma.extraCost.findMany({
    where:   { messId, month, year },
    include: { addedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const total = costs.reduce((s, c) => s + c.amount, 0);
  res.json({ costs, total });
}

// POST /api/extra-costs/:messId
export async function addExtraCost(req: Request, res: Response) {
  const { messId } = req.params;
  const { name, amount, month, year } = req.body;

  if (!name?.trim())  { res.status(400).json({ error: "Name is required." }); return; }
  if (!amount)        { res.status(400).json({ error: "Amount is required." }); return; }
  if (!month || !year){ res.status(400).json({ error: "month and year are required." }); return; }
  if (Number(amount) <= 0) { res.status(400).json({ error: "Amount must be positive." }); return; }

  if (req.memberRole !== MemberRole.SUPER_ADMIN) {
    const allowed = await assertMonthlyManager(messId, req.userId, Number(month), Number(year), res);
    if (!allowed) return;
  }

  const cost = await prisma.extraCost.create({
    data: {
      messId, month: Number(month), year: Number(year),
      name: name.trim(), amount: Number(amount),
      addedById: req.userId,
    },
    include: { addedBy: { select: { id: true, name: true } } },
  });

  res.status(201).json({ cost });
}

// DELETE /api/extra-costs/:messId/:costId
export async function deleteExtraCost(req: Request, res: Response) {
  const { messId, costId } = req.params;

  const cost = await prisma.extraCost.findUnique({ where: { id: costId } });
  if (!cost || cost.messId !== messId) {
    res.status(404).json({ error: "Extra cost not found." });
    return;
  }

  if (req.memberRole !== MemberRole.SUPER_ADMIN) {
    const allowed = await assertMonthlyManager(messId, req.userId, cost.month, cost.year, res);
    if (!allowed) return;
  }

  await prisma.extraCost.delete({ where: { id: costId } });
  res.json({ message: "Extra cost deleted." });
}
