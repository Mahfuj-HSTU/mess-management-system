import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { MemberRole } from "@prisma/client";

// POST /api/payments/:messId
export async function addPayment(req: Request, res: Response) {
  const { memberId, amount, note, date } = req.body;
  const messId = req.params.messId;

  if (!memberId || !amount || !date) {
    res.status(400).json({ error: "memberId, amount, and date are required." });
    return;
  }
  if (isNaN(Number(amount)) || Number(amount) <= 0) {
    res.status(400).json({ error: "Amount must be a positive number." });
    return;
  }

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
      amount: Number(amount),
      note: note?.trim() || null,
      date: new Date(date),
      addedById: req.userId,
    },
    include: {
      member: { select: { id: true, name: true } },
      addedBy: { select: { id: true, name: true } },
    },
  });

  // Update manager cash: add payment amount
  await prisma.managerCash.upsert({
    where: { messId },
    update: { balance: { increment: Number(amount) } },
    create: { messId, balance: Number(amount) },
  });

  res.status(201).json({ payment });
}

// GET /api/payments/:messId?month=&year=
export async function getPayments(req: Request, res: Response) {
  const messId = req.params.messId;
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const payments = await prisma.payment.findMany({
    where: {
      messId,
      date: { gte: startDate, lte: endDate },
    },
    include: {
      member: { select: { id: true, name: true } },
      addedBy: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

  res.json({ payments, totalPayments });
}

// GET /api/payments/:messId/member/:userId?month=&year=
export async function getMemberPayments(req: Request, res: Response) {
  const { messId, userId } = req.params;
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const payments = await prisma.payment.findMany({
    where: {
      messId,
      memberId: userId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "desc" },
  });

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  res.json({ payments, totalPaid });
}

// DELETE /api/payments/:messId/:paymentId
export async function deletePayment(req: Request, res: Response) {
  const { messId, paymentId } = req.params;

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.messId !== messId) {
    res.status(404).json({ error: "Payment not found." });
    return;
  }

  // Deduct from cash
  await prisma.managerCash.update({
    where: { messId },
    data: { balance: { decrement: payment.amount } },
  });

  await prisma.payment.delete({ where: { id: paymentId } });
  res.json({ message: "Payment deleted." });
}

// GET /api/payments/:messId/cash  — manager only
export async function getCashBalance(req: Request, res: Response) {
  const messId = req.params.messId;

  if (
    req.memberRole !== MemberRole.MANAGER &&
    req.memberRole !== MemberRole.SUPER_ADMIN
  ) {
    res.status(403).json({ error: "Only the manager can view cash balance." });
    return;
  }

  const cash = await prisma.managerCash.findUnique({ where: { messId } });
  res.json({ balance: cash?.balance ?? 0 });
}
