/**
 * RTK Query API
 *
 * All server requests live here. Each endpoint automatically gives us:
 *   - useXxxQuery()   → for reading data (GET)
 *   - useXxxMutation() → for writing data (POST / DELETE)
 *
 * Cache invalidation (providesTags / invalidatesTags) keeps the UI
 * in sync after mutations without manual refetching.
 */

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  Mess,
  MemberRole,
  Meal,
  MealSummary,
  Bazaar,
  Payment,
  MonthlyReport,
  ReportHistoryItem,
} from "@/types";

// ─── Response shape types ─────────────────────────────────────────────────────

export interface GetMyMessResponse {
  mess: Mess;
  role: MemberRole;
}

interface MealsResponse {
  meals: Meal[];
  summary: MealSummary[];
}

interface BazaarResponse {
  bazaars: Bazaar[];
  totalCost: number;
}

interface PaymentsResponse {
  payments: Payment[];
  totalPayments: number;
}

interface CashResponse {
  balance: number;
}

interface ReportHistoryResponse {
  history: ReportHistoryItem[];
}

// ─── Shared param types ───────────────────────────────────────────────────────

interface MonthParams {
  messId: string;
  month: number;
  year: number;
}

// ─── API definition ───────────────────────────────────────────────────────────

export const api = createApi({
  reducerPath: "api",

  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
    credentials: "include", // send cookies for Better Auth sessions
  }),

  // Tags let RTK Query know which cached data to clear after mutations
  tagTypes: ["Mess", "Meals", "Bazaar", "Payments", "Cash", "Report"],

  endpoints: (builder) => ({
    // ── Mess ─────────────────────────────────────────────────────────────────

    /** Get the mess the current user belongs to */
    getMyMess: builder.query<GetMyMessResponse, void>({
      query: () => "/api/mess/my",
      providesTags: ["Mess"],
    }),

    createMess: builder.mutation<{ mess: Mess }, { name: string }>({
      query: (body) => ({ url: "/api/mess/create", method: "POST", body }),
      invalidatesTags: ["Mess"],
    }),

    joinMess: builder.mutation<void, { code: string }>({
      query: (body) => ({ url: "/api/mess/join", method: "POST", body }),
      invalidatesTags: ["Mess"],
    }),

    /** Super admin only — promotes a member to manager */
    assignManager: builder.mutation<
      { message: string },
      { messId: string; userId: string }
    >({
      query: ({ messId, userId }) => ({
        url: `/api/mess/${messId}/assign-manager`,
        method: "POST",
        body: { userId },
      }),
      invalidatesTags: ["Mess"],
    }),

    // ── Meals ─────────────────────────────────────────────────────────────────

    getMeals: builder.query<MealsResponse, MonthParams>({
      query: ({ messId, month, year }) =>
        `/api/meals/${messId}?month=${month}&year=${year}`,
      providesTags: ["Meals"],
    }),

    addMeal: builder.mutation<
      void,
      {
        messId: string;
        userId: string;
        date: string;
        breakfast: boolean;
        lunch: boolean;
        dinner: boolean;
      }
    >({
      query: ({ messId, ...body }) => ({
        url: `/api/meals/${messId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Meals", "Report"],
    }),

    deleteMeal: builder.mutation<void, { messId: string; mealId: string }>({
      query: ({ messId, mealId }) => ({
        url: `/api/meals/${messId}/${mealId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Meals", "Report"],
    }),

    // ── Bazaar ────────────────────────────────────────────────────────────────

    getBazaars: builder.query<BazaarResponse, MonthParams>({
      query: ({ messId, month, year }) =>
        `/api/bazaar/${messId}?month=${month}&year=${year}`,
      providesTags: ["Bazaar"],
    }),

    addBazaar: builder.mutation<
      void,
      { messId: string; amount: number; description?: string; date: string }
    >({
      query: ({ messId, ...body }) => ({
        url: `/api/bazaar/${messId}`,
        method: "POST",
        body,
      }),
      // Bazaar affects total cost → meal rate → report → cash balance
      invalidatesTags: ["Bazaar", "Report", "Cash"],
    }),

    deleteBazaar: builder.mutation<
      void,
      { messId: string; bazaarId: string }
    >({
      query: ({ messId, bazaarId }) => ({
        url: `/api/bazaar/${messId}/${bazaarId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Bazaar", "Report", "Cash"],
    }),

    // ── Payments ──────────────────────────────────────────────────────────────

    getPayments: builder.query<PaymentsResponse, MonthParams>({
      query: ({ messId, month, year }) =>
        `/api/payments/${messId}?month=${month}&year=${year}`,
      providesTags: ["Payments"],
    }),

    addPayment: builder.mutation<
      void,
      {
        messId: string;
        memberId: string;
        amount: number;
        note?: string;
        date: string;
      }
    >({
      query: ({ messId, ...body }) => ({
        url: `/api/payments/${messId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Payments", "Report", "Cash"],
    }),

    deletePayment: builder.mutation<
      void,
      { messId: string; paymentId: string }
    >({
      query: ({ messId, paymentId }) => ({
        url: `/api/payments/${messId}/${paymentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Payments", "Report", "Cash"],
    }),

    /** Manager-only: cash balance hidden from regular members */
    getCashBalance: builder.query<CashResponse, string>({
      query: (messId) => `/api/payments/${messId}/cash`,
      providesTags: ["Cash"],
    }),

    // ── Reports ───────────────────────────────────────────────────────────────

    getMonthlyReport: builder.query<MonthlyReport, MonthParams>({
      query: ({ messId, month, year }) =>
        `/api/reports/${messId}/monthly?month=${month}&year=${year}`,
      providesTags: ["Report"],
    }),

    getReportHistory: builder.query<ReportHistoryResponse, string>({
      query: (messId) => `/api/reports/${messId}/history`,
    }),

    sendReminders: builder.mutation<
      { message: string; results: { name: string; sent: boolean }[] },
      { messId: string; month: number; year: number }
    >({
      query: ({ messId, month, year }) => ({
        url: `/api/reports/${messId}/send-reminders`,
        method: "POST",
        body: { month, year },
      }),
    }),
  }),
});

// Export auto-generated hooks — named after each endpoint
export const {
  useGetMyMessQuery,
  useCreateMessMutation,
  useJoinMessMutation,
  useAssignManagerMutation,
  useGetMealsQuery,
  useAddMealMutation,
  useDeleteMealMutation,
  useGetBazaarsQuery,
  useAddBazaarMutation,
  useDeleteBazaarMutation,
  useGetPaymentsQuery,
  useAddPaymentMutation,
  useDeletePaymentMutation,
  useGetCashBalanceQuery,
  useGetMonthlyReportQuery,
  useGetReportHistoryQuery,
  useSendRemindersMutation,
} = api;
