import { Router } from "express";
import { getMealConfig, updateMealConfig } from "../controllers/config.controller";
import { requireAuth, requireMessMember } from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });

router.get("/",  requireAuth, requireMessMember, getMealConfig);
router.put("/",  requireAuth, requireMessMember, updateMealConfig);

export default router;
