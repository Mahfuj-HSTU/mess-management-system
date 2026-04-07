import { Router } from "express";
import {
  addPayment,
  getPayments,
  deletePayment,
  getCashBalance,
} from "../controllers/payment.controller";
import { requireAuth, requireMessMember } from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });

router.get("/",                 requireAuth, requireMessMember, getPayments);
router.post("/",                requireAuth, requireMessMember, addPayment);
router.get("/cash",             requireAuth, requireMessMember, getCashBalance);
router.delete("/:paymentId",    requireAuth, requireMessMember, deletePayment);

export default router;
