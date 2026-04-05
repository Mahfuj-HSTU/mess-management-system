import { Router } from "express";
import {
  addBazaar,
  getBazaars,
  deleteBazaar,
} from "../controllers/bazaar.controller";
import {
  requireAuth,
  requireMessMember,
  requireManager,
} from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, requireMessMember, getBazaars);
router.post("/", requireAuth, requireMessMember, requireManager, addBazaar);
router.delete("/:bazaarId", requireAuth, requireMessMember, requireManager, deleteBazaar);

export default router;
