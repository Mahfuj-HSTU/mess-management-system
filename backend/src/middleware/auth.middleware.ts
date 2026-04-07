import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";
import { prisma } from "../lib/prisma";
import { MemberRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      messId: string;
      memberRole: MemberRole;
    }
  }
}

/** Verify the session cookie and attach userId to the request. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: "Unauthorized. Please log in." });
    return;
  }

  req.userId = session.user.id;
  next();
}

/** Verify the user belongs to the mess and attach messId + memberRole. */
export async function requireMessMember(req: Request, res: Response, next: NextFunction) {
  const messId = req.params.messId ?? req.body.messId;
  if (!messId) {
    res.status(400).json({ error: "messId is required." });
    return;
  }

  const member = await prisma.messMember.findUnique({
    where: { messId_userId: { messId, userId: req.userId } },
  });

  if (!member) {
    res.status(403).json({ error: "You are not a member of this mess." });
    return;
  }

  req.messId     = messId;
  req.memberRole = member.role;
  next();
}

/** Only the super admin (the mess creator) may proceed. */
export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.memberRole !== MemberRole.SUPER_ADMIN) {
    res.status(403).json({ error: "Only the super admin can perform this action." });
    return;
  }
  next();
}
