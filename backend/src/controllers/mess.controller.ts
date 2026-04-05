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

  // Check if user already belongs to a mess
  const existing = await prisma.messMember.findFirst({
    where: { userId: req.userId },
  });
  if (existing) {
    res
      .status(400)
      .json({ error: "You already belong to a mess. Leave it first." });
    return;
  }

  let code = generateMessCode();
  // Ensure uniqueness
  while (await prisma.mess.findUnique({ where: { code } })) {
    code = generateMessCode();
  }

  const mess = await prisma.mess.create({
    data: {
      name: name.trim(),
      code,
      members: {
        create: {
          userId: req.userId,
          role: MemberRole.SUPER_ADMIN,
        },
      },
      cash: {
        create: { balance: 0 },
      },
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
    res.status(404).json({ error: "Invalid mess code. No mess found." });
    return;
  }

  const alreadyMember = await prisma.messMember.findUnique({
    where: { messId_userId: { messId: mess.id, userId: req.userId } },
  });
  if (alreadyMember) {
    res.status(400).json({ error: "You are already a member of this mess." });
    return;
  }

  const existingMess = await prisma.messMember.findFirst({
    where: { userId: req.userId },
  });
  if (existingMess) {
    res.status(400).json({ error: "You already belong to another mess." });
    return;
  }

  const member = await prisma.messMember.create({
    data: {
      messId: mess.id,
      userId: req.userId,
      role: MemberRole.MEMBER,
    },
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
            include: {
              user: { select: { id: true, name: true, email: true, image: true } },
            },
            orderBy: { joinedAt: "asc" },
          },
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

// GET /api/mess/:messId
export async function getMessById(req: Request, res: Response) {
  const mess = await prisma.mess.findUnique({
    where: { id: req.params.messId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!mess) {
    res.status(404).json({ error: "Mess not found." });
    return;
  }

  res.json({ mess });
}

// POST /api/mess/:messId/assign-manager
export async function assignManager(req: Request, res: Response) {
  const { userId } = req.body;
  const messId = req.params.messId;

  if (!userId) {
    res.status(400).json({ error: "userId is required." });
    return;
  }

  const targetMember = await prisma.messMember.findUnique({
    where: { messId_userId: { messId, userId } },
  });
  if (!targetMember) {
    res.status(404).json({ error: "User is not a member of this mess." });
    return;
  }
  if (targetMember.role === MemberRole.SUPER_ADMIN) {
    res.status(400).json({ error: "Cannot change super admin's role." });
    return;
  }

  // Demote existing manager if any
  await prisma.messMember.updateMany({
    where: { messId, role: MemberRole.MANAGER },
    data: { role: MemberRole.MEMBER },
  });

  const updated = await prisma.messMember.update({
    where: { messId_userId: { messId, userId } },
    data: { role: MemberRole.MANAGER },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  res.json({ member: updated, message: `${updated.user.name} is now the manager.` });
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
