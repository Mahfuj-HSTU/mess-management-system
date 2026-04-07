import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { MemberRole } from "@prisma/client";
import { assertMonthlyManager, monthYearFromDate } from "../lib/permissions";

// POST /api/payments/:messId
export async function addPayment(req: Request, res: Response) {
  const messId = req.params.messId;
  const { memberId, amount, note, date } = req.body;

  if (!memberId || !amount || !date) {
    res.status(400).json({ error: "memberId, amount, and date are required." });
    return;
  }
  if (Number(amount) <= 0) {
    res.status(400).json({ error: "Amount must be a positive number." });
    return;
  }

  const { month, year } = monthYearFromDate(date);
  const allowed = await assertMonthlyManager(messId, req.userId, month, year, res);
  if (!allowed) return;

  const member = await prisma.messMember.findUnique({
    where: { messId_userId: { messId, userId: memberId } },
  });
  if (!member) {
    res.status(404).json({ error: "Member not found in this mess." });
    return;
  }

  const payment = await prisma.payment.create({
    data: {
      messId,
      memberId,
      amount:    Number(amount),
      note:      note?.trim() || null,
      date:      new Date(date),
      addedById: req.userId,
    },
    include: {
      member:  { select: { id: true, name: true } },
      addedBy: { select: { id: true, name: true } },
    },
  });

  await prisma.managerCash.upsert({
    where:  { messId },
    update: { balance: { increment: Number(amount) } },
    create: { messId, balance: Number(amount) },
  });

  res.status(201).json({ payment });
}

// GET /api/payments/:messId?month=&year=
export async function getPayments(req: Request, res: Response) {
  const messId = req.params.messId;
  const month  = Number(req.query.month) || new Date().getMonth() + 1;
  const year   = Number(req.query.year)  || new Date().getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0);

  const payments = await prisma.payment.findMany({
    where:   { messId, date: { gte: startDate, lte: endDate } },
    include: {
      member:  { select: { id: true, name: true } },
      addedBy: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  res.json({ payments, totalPayments });
}

// DELETE /api/payments/:messId/:paymentId
export async function deletePayment(req: Request, res: Response) {
  const { messId, paymentId } = req.params;

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.messId !== messId) {
    res.status(404).json({ error: "Payment not found." });
    return;
  }

  const { month, year } = monthYearFromDate(payment.date.toISOString());
  const allowed = await assertMonthlyManager(messId, req.userId, month, year, res);
  if (!allowed) return;

  await prisma.managerCash.update({
    where: { messId },
    data:  { balance: { decrement: payment.amount } },
  });

  await prisma.payment.delete({ where: { id: paymentId } });
  res.json({ message: "Payment deleted." });
}

// GET /api/payments/:messId/cash
// Only the monthly manager for the requested month (or super admin) can see cash balance.
export async function getCashBalance(req: Request, res: Response) {
  const messId = req.params.messId;

  // Super admin can always see it
  if (req.memberRole === MemberRole.SUPER_ADMIN) {
    const cash = await prisma.managerCash.findUnique({ where: { messId } });
    res.json({ balance: cash?.balance ?? 0 });
    return;
  }

  // Monthly manager for current month can see it
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year  = Number(req.query.year)  || new Date().getFullYear();

  const record = await prisma.monthlyManager.findUnique({
    where: { messId_month_year: { messId, month, year } },
  });

  if (!record || record.userId !== req.userId) {
    res.status(403).json({ error: "Only the monthly manager can view the cash balance." });
    return;
  }

  const cash = await prisma.managerCash.findUnique({ where: { messId } });
  res.json({ balance: cash?.balance ?? 0 });
}
