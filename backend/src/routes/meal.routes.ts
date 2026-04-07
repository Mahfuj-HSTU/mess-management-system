import { Router } from "express";
import { addMeal, getMeals, deleteMeal } from "../controllers/meal.controller";
import { requireAuth, requireMessMember } from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });

// All members can view; monthly manager permission is checked inside the controller
router.get("/",           requireAuth, requireMessMember, getMeals);
router.post("/",          requireAuth, requireMessMember, addMeal);
router.delete("/:mealId", requireAuth, requireMessMember, deleteMeal);

export default router;
