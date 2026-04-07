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
  note?: string | null;
  date: string;
  addedById: string;
  member?: { id: string; name: string };
  addedBy?: { id: string; name: string };
}

export interface MemberReport {
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  totalMeals: number;
  mealCost: number;
  totalPaid: number;
  due: number;
}

export interface MonthlyReport {
  month: number;
  year: number;
  monthName: string;
  totalBazaarCost: number;
  totalMeals: number;
  mealRate: number;
  monthlyManager: MonthlyManager | null;
  memberReports: MemberReport[];
}

export interface ReportHistoryItem {
  year: number;
  month: number;
  monthName: string;
}
