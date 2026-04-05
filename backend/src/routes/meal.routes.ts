import { Router } from "express";
import {
  addMeal,
  getMeals,
  getMemberMeals,
  deleteMeal,
} from "../controllers/meal.controller";
import {
  requireAuth,
  requireMessMember,
  requireManager,
} from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, requireMessMember, getMeals);
router.post("/", requireAuth, requireMessMember, requireManager, addMeal);
router.get("/member/:userId", requireAuth, requireMessMember, getMemberMeals);
router.delete("/:mealId", requireAuth, requireMessMember, requireManager, deleteMeal);

export default router;
