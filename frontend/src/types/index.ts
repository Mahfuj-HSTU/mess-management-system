export type MemberRole = "SUPER_ADMIN" | "MANAGER" | "MEMBER";

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
  joinedAt: string;
  user: User;
}

export interface Mess {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  members: MessMember[];
}

export interface Meal {
  id: string;
  messId: string;
  userId: string;
  date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
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
  totalMeals: number;
}

export interface Bazaar {
  id: string;
  messId: string;
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
  memberReports: MemberReport[];
}

export interface ReportHistoryItem {
  year: number;
  month: number;
  monthName: string;
}
