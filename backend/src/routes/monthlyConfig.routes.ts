import { Router } from "express";
import { getMonthlyConfig, updateMonthlyConfig } from "../controllers/monthlyConfig.controller";
import { requireAuth, requireMessMember } from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });

router.get("/",  requireAuth, requireMessMember, getMonthlyConfig);
router.put("/",  requireAuth, requireMessMember, updateMonthlyConfig);

export default router;
