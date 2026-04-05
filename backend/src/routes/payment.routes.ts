import { Router } from "express";
import {
  addPayment,
  getPayments,
  getMemberPayments,
  deletePayment,
  getCashBalance,
} from "../controllers/payment.controller";
import {
  requireAuth,
  requireMessMember,
  requireManager,
} from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, requireMessMember, getPayments);
router.post("/", requireAuth, requireMessMember, requireManager, addPayment);
router.get("/cash", requireAuth, requireMessMember, getCashBalance);
router.get("/member/:userId", requireAuth, requireMessMember, getMemberPayments);
router.delete("/:paymentId", requireAuth, requireMessMember, requireManager, deletePayment);

export default router;
