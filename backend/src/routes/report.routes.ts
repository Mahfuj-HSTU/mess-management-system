import { Router } from "express";
import {
  getMonthlyReport,
  sendDueReminders,
  getReportHistory,
} from "../controllers/report.controller";
import {
  requireAuth,
  requireMessMember,
} from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });

router.get("/monthly", requireAuth, requireMessMember, getMonthlyReport);
router.get("/history", requireAuth, requireMessMember, getReportHistory);
router.post("/send-reminders", requireAuth, requireMessMember, sendDueReminders);

export default router;
