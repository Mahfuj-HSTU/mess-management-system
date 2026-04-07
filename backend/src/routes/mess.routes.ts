import { Router } from "express";
import {
  createMess,
  joinMess,
  getMyMess,
  getMonthlyManager,
  assignMonthlyManager,
  updateSuperAdminMembership,
  leaveMess,
} from "../controllers/mess.controller";
import {
  requireAuth,
  requireMessMember,
  requireSuperAdmin,
} from "../middleware/auth.middleware";

const router = Router();

router.post("/create",   requireAuth, createMess);
router.post("/join",     requireAuth, joinMess);
router.get("/my",        requireAuth, getMyMess);

// Monthly manager routes
router.get("/:messId/monthly-manager",          requireAuth, requireMessMember, getMonthlyManager);
router.post("/:messId/assign-monthly-manager",  requireAuth, requireMessMember, requireSuperAdmin, assignMonthlyManager);

router.patch("/:messId/membership", requireAuth, requireMessMember, updateSuperAdminMembership);
router.delete("/:messId/leave",      requireAuth, requireMessMember, leaveMess);

export default router;
