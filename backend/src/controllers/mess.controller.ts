import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { MemberRole } from "@prisma/client";
import { nanoid } from "nanoid";

function generateMessCode(): string {
  return nanoid(8).toUpperCase();
}

// POST /api/mess/create
export async function createMess(req: Request, res: Response) {
  const { name } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: "Mess name is required." });
    return;
  }

  const existing = await prisma.messMember.findFirst({ where: { userId: req.userId } });
  if (existing) {
    res.status(400).json({ error: "You already belong to a mess." });
    return;
  }

  let code = generateMessCode();
  while (await prisma.mess.findUnique({ where: { code } })) {
    code = generateMessCode();
  }

  const mess = await prisma.mess.create({
    data: {
      name: name.trim(),
      code,
      members: {
        create: { userId: req.userId, role: MemberRole.SUPER_ADMIN },
      },
      cash:   { create: { balance: 0 } },
      mealConfig: { create: { breakfast: 0, lunch: 1, dinner: 1, updatedById: req.userId } },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  res.status(201).json({ mess });
}

// POST /api/mess/join
export async function joinMess(req: Request, res: Response) {
  const { code } = req.body;
  if (!code?.trim()) {
    res.status(400).json({ error: "Mess code is required." });
    return;
  }

  const mess = await prisma.mess.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!mess) {
    res.status(404).json({ error: "Invalid mess code." });
    return;
  }

  const alreadyMember = await prisma.messMember.findUnique({
    where: { messId_userId: { messId: mess.id, userId: req.userId } },
  });
  if (alreadyMember) {
    res.status(400).json({ error: "You are already a member of this mess." });
    return;
  }

  const inAnotherMess = await prisma.messMember.findFirst({ where: { userId: req.userId } });
  if (inAnotherMess) {
    res.status(400).json({ error: "You already belong to another mess." });
    return;
  }

  const member = await prisma.messMember.create({
    data: { messId: mess.id, userId: req.userId, role: MemberRole.MEMBER },
    include: { mess: true },
  });

  res.status(201).json({ member });
}

// GET /api/mess/my
export async function getMyMess(req: Request, res: Response) {
  const membership = await prisma.messMember.findFirst({
    where: { userId: req.userId },
    include: {
      mess: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
            orderBy: { joinedAt: "asc" },
          },
          mealConfig: true,
        },
      },
    },
  });

  if (!membership) {
    res.status(404).json({ error: "You don't belong to any mess yet." });
    return;
  }

  res.json({ mess: membership.mess, role: membership.role });
}

// GET /api/mess/:messId/monthly-manager?month=&year=
// Returns who is the monthly manager for a given month (null if not assigned)
export async function getMonthlyManager(req: Request, res: Response) {
  const messId = req.params.messId;
  const month  = Number(req.query.month) || new Date().getMonth() + 1;
  const year   = Number(req.query.year)  || new Date().getFullYear();

  const record = await prisma.monthlyManager.findUnique({
    where: { messId_month_year: { messId, month, year } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  res.json({ manager: record ?? null });
}

// POST /api/mess/:messId/assign-monthly-manager   (super admin only)
// Assigns a member as manager for a specific month+year.
// If that month already has a manager, they are replaced.
export async function assignMonthlyManager(req: Request, res: Response) {
  const messId        = req.params.messId;
  const { userId, month, year } = req.body;

  if (!userId || !month || !year) {
    res.status(400).json({ error: "userId, month and year are required." });
    return;
  }
  if (month < 1 || month > 12) {
    res.status(400).json({ error: "month must be between 1 and 12." });
    return;
  }

  // Target user must be a mess member (but not the super admin themselves)
  const targetMember = await prisma.messMember.findUnique({
    where: { messId_userId: { messId, userId } },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!targetMember) {
    res.status(404).json({ error: "User is not a member of this mess." });
    return;
  }
  if (targetMember.role === MemberRole.SUPER_ADMIN) {
    res.status(400).json({ error: "Super admin cannot be assigned as a monthly manager." });
    return;
  }

  // Upsert: create or replace the monthly manager for that month
  const record = await prisma.monthlyManager.upsert({
    where:  { messId_month_year: { messId, month: Number(month), year: Number(year) } },
    update: { userId },
    create: { messId, userId, month: Number(month), year: Number(year) },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  res.json({
    manager: record,
    message: `${targetMember.user.name} is now the manager for month ${month}/${year}.`,
  });
}

// DELETE /api/mess/:messId/leave
export async function leaveMess(req: Request, res: Response) {
  const messId = req.params.messId;

  const member = await prisma.messMember.findUnique({
    where: { messId_userId: { messId, userId: req.userId } },
  });
  if (!member) {
    res.status(404).json({ error: "You are not a member of this mess." });
    return;
  }
  if (member.role === MemberRole.SUPER_ADMIN) {
    res.status(400).json({ error: "Super admin cannot leave the mess." });
    return;
  }

  await prisma.messMember.delete({
    where: { messId_userId: { messId, userId: req.userId } },
  });

  res.json({ message: "You have left the mess." });
}
