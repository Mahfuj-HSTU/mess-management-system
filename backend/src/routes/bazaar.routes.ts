import { Router } from "express";
import { addBazaar, getBazaars, deleteBazaar } from "../controllers/bazaar.controller";
import { requireAuth, requireMessMember } from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });

router.get("/",               requireAuth, requireMessMember, getBazaars);
router.post("/",              requireAuth, requireMessMember, addBazaar);
router.delete("/:bazaarId",   requireAuth, requireMessMember, deleteBazaar);

export default router;
