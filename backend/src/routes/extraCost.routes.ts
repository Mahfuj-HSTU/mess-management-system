import { Router } from "express";
import { getExtraCosts, addExtraCost, deleteExtraCost } from "../controllers/extraCost.controller";
import { requireAuth, requireMessMember } from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });

router.get("/",         requireAuth, requireMessMember, getExtraCosts);
router.post("/",        requireAuth, requireMessMember, addExtraCost);
router.delete("/:costId", requireAuth, requireMessMember, deleteExtraCost);

export default router;
