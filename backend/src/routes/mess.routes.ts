import { Router } from "express";
import {
  createMess,
  joinMess,
  getMyMess,
  getMessById,
  assignManager,
  leaveMess,
} from "../controllers/mess.controller";
import {
  requireAuth,
  requireMessMember,
  requireSuperAdmin,
} from "../middleware/auth.middleware";

const router = Router();

router.post("/create", requireAuth, createMess);
router.post("/join", requireAuth, joinMess);
router.get("/my", requireAuth, getMyMess);
router.get("/:messId", requireAuth, requireMessMember, getMessById);
router.post(
  "/:messId/assign-manager",
  requireAuth,
  requireMessMember,
  requireSuperAdmin,
  assignManager
);
router.delete("/:messId/leave", requireAuth, requireMessMember, leaveMess);

export default router;
