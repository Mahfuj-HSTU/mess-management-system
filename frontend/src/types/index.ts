// Only two permanent roles — manager is tracked per-month in MonthlyManager
export type MemberRole = "SUPER_ADMIN" | "MEMBER";

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface MessMember {
  id: string;
  messId: string;
  userId: string;
  role: MemberRole;
  isMember: boolean;
  joinedAt: string;
  user: User;
}

export interface MonthlyManager {
  id: string;
  messId: string;
  userId: string;
  month: number;
  year: number;
  assignedAt: string;
  user: User;
}

export interface MealConfig {
  breakfast: number; // 0 = disabled/ignored
  lunch: number;     // default 1
  dinner: number;    // default 1
}

export interface Mess {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  members: MessMember[];
  mealConfig: MealConfig | null;
}

export interface Meal {
  id: string;
  messId: string;
  userId: string;
  date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  guestBreakfast: number;
  guestLunch: number;
  guestDinner: number;
  totalMeals: number;
  addedById: string;
  addedBy?: { name: string };
}

export interface MealSummary {
  userId: string;
  name: string;
  role: MemberRole;
  totalBreakfast: number;
  totalLunch: number;
  totalDinner: number;
  totalGuestBreakfast: number;
  totalGuestLunch: number;
  totalGuestDinner: number;
  totalMeals: number;
}

export interface Bazaar {
  id: string;
  messId: string;
  name: string;
  amount: number;
  description?: string | null;
  date: string;
  addedById: string;
  addedBy?: { id: string; name: string };
}

export interface Payment {
  id: string;
  messId: string;
  memberId: string;
  amount: number;
  fixedAmount: number;
  note?: string | null;
  date: string;
  addedById: string;
  member?: { id: string; name: string };
  addedBy?: { id: string; name: string };
}

export interface MonthlyConfig {
  messId?: string;
  month?: number;
  year?: number;
  buaPerMember: number;
  hasRamadan: boolean;
  ramadanStartDay: number;
}

export interface ExtraCost {
  id: string;
  messId: string;
  month: number;
  year: number;
  name: string;
  amount: number;
  addedById: string;
  addedBy?: { id: string; name: string };
  createdAt: string;
}

export interface MemberReport {
  userId: string;
  name: string;
  email: string;
  period1Meals: number;
  period2Meals: number;
  totalMeals: number;
  mealCost: number;
  totalPaid: number;
  mealPaid: number;
  fixedPaid: number;
  fixedCharge: number;
  mealDue: number;
  fixedDue: number;
  managerGets: number;
  memberGets: number;
  due: number;
}

export interface PeriodSummary {
  totalBazaar: number;
  totalMeals: number;
  mealRate: number;
}

export interface MonthlyReport {
  month: number;
  year: number;
  monthName: string;
  monthlyManager: MonthlyManager | null;
  // Meal totals
  totalBazaarCost: number;
  totalMeals: number;
  mealRate: number;
  // Bua
  buaPerMember: number;
  totalBuaBill: number;
  // Extra costs
  totalExtraCosts: number;
  extraPerMember: number;
  fixedChargePerMember: number;
  // Ramadan
  hasRamadan: boolean;
  ramadanStartDay: number;
  period1: PeriodSummary | null;
  period2: PeriodSummary | null;
  memberReports: MemberReport[];
}

export interface ReportHistoryItem {
  year: number;
  month: number;
  monthName: string;
}
