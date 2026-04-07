/**
 * RTK Query API — all server requests in one place.
 *
 * Hooks are auto-generated per endpoint:
 *   useXxxQuery()    → GET (read, cached)
 *   useXxxMutation() → POST / PUT / DELETE (write)
 */

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  Mess, MemberRole, Meal, MealSummary, MealConfig,
  Bazaar, Payment, MonthlyManager, MonthlyReport, ReportHistoryItem,
} from "@/types";

// ─── Response types ───────────────────────────────────────────────────────────

export interface GetMyMessResponse  { mess: Mess; role: MemberRole }
interface MealsResponse             { meals: Meal[]; summary: MealSummary[] }
interface BazaarResponse            { bazaars: Bazaar[]; totalCost: number }
interface PaymentsResponse          { payments: Payment[]; totalPayments: number }
interface CashResponse              { balance: number }
interface MealConfigResponse        { config: MealConfig }
interface MonthlyManagerResponse    { manager: MonthlyManager | null }
interface ReportHistoryResponse     { history: ReportHistoryItem[] }

interface MonthParams { messId: string; month: number; year: number }

// ─── API ──────────────────────────────────────────────────────────────────────

export const api = createApi({
  reducerPath: "api",

  baseQuery: fetchBaseQuery({
    baseUrl:     process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
    credentials: "include",
  }),

  tagTypes: ["Mess", "MonthlyManager", "Meals", "Bazaar", "Payments", "Cash", "Report", "MealConfig"],

  endpoints: (builder) => ({

    // ── Mess ──────────────────────────────────────────────────────────────────

    getMyMess: builder.query<GetMyMessResponse, void>({
      query:        () => "/api/mess/my",
      providesTags: ["Mess"],
    }),

    createMess: builder.mutation<{ mess: Mess }, { name: string }>({
      query:          (body) => ({ url: "/api/mess/create", method: "POST", body }),
      invalidatesTags: ["Mess"],
    }),

    joinMess: builder.mutation<void, { code: string }>({
      query:          (body) => ({ url: "/api/mess/join", method: "POST", body }),
      invalidatesTags: ["Mess"],
    }),

    // ── Monthly Manager ───────────────────────────────────────────────────────

    /** Get who is the manager for a specific month (null if not assigned yet) */
    getMonthlyManager: builder.query<MonthlyManagerResponse, MonthParams>({
      query:        ({ messId, month, year }) =>
        `/api/mess/${messId}/monthly-manager?month=${month}&year=${year}`,
      providesTags: ["MonthlyManager"],
    }),

    /** Super admin only — assign a member as manager for a specific month */
    assignMonthlyManager: builder.mutation<
      { manager: MonthlyManager; message: string },
      { messId: string; userId: string; month: number; year: number }
    >({
      query: ({ messId, ...body }) => ({
        url:    `/api/mess/${messId}/assign-monthly-manager`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["MonthlyManager", "Mess"],
    }),

    // ── Meal Config ───────────────────────────────────────────────────────────

    getMealConfig: builder.query<MealConfigResponse, string>({
      query:        (messId) => `/api/config/${messId}`,
      providesTags: ["MealConfig"],
    }),

    /** Monthly manager updates how many meals each type counts as */
    updateMealConfig: builder.mutation<
      MealConfigResponse,
      { messId: string; breakfast: number; lunch: number; dinner: number; month: number; year: number }
    >({
      query: ({ messId, ...body }) => ({
        url:    `/api/config/${messId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["MealConfig", "Meals", "Report"],
    }),

    // ── Meals ─────────────────────────────────────────────────────────────────

    getMeals: builder.query<MealsResponse, MonthParams>({
      query:        ({ messId, month, year }) =>
        `/api/meals/${messId}?month=${month}&year=${year}`,
      providesTags: ["Meals"],
    }),

    addMeal: builder.mutation<void, {
      messId: string; userId: string; date: string;
      breakfast: boolean; lunch: boolean; dinner: boolean; guestMeals?: number;
    }>({
      query: ({ messId, ...body }) => ({
        url: `/api/meals/${messId}`, method: "POST", body,
      }),
      invalidatesTags: ["Meals", "Report"],
    }),

    deleteMeal: builder.mutation<void, { messId: string; mealId: string }>({
      query: ({ messId, mealId }) => ({
        url: `/api/meals/${messId}/${mealId}`, method: "DELETE",
      }),
      invalidatesTags: ["Meals", "Report"],
    }),

    // ── Bazaar ────────────────────────────────────────────────────────────────

    getBazaars: builder.query<BazaarResponse, MonthParams>({
      query:        ({ messId, month, year }) =>
        `/api/bazaar/${messId}?month=${month}&year=${year}`,
      providesTags: ["Bazaar"],
    }),

    addBazaar: builder.mutation<void, {
      messId: string; amount: number; description?: string; date: string;
    }>({
      query: ({ messId, ...body }) => ({
        url: `/api/bazaar/${messId}`, method: "POST", body,
      }),
      invalidatesTags: ["Bazaar", "Report", "Cash"],
    }),

    deleteBazaar: builder.mutation<void, { messId: string; bazaarId: string }>({
      query: ({ messId, bazaarId }) => ({
        url: `/api/bazaar/${messId}/${bazaarId}`, method: "DELETE",
      }),
      invalidatesTags: ["Bazaar", "Report", "Cash"],
    }),

    // ── Payments ──────────────────────────────────────────────────────────────

    getPayments: builder.query<PaymentsResponse, MonthParams>({
      query:        ({ messId, month, year }) =>
        `/api/payments/${messId}?month=${month}&year=${year}`,
      providesTags: ["Payments"],
    }),

    addPayment: builder.mutation<void, {
      messId: string; memberId: string; amount: number; note?: string; date: string;
    }>({
      query: ({ messId, ...body }) => ({
        url: `/api/payments/${messId}`, method: "POST", body,
      }),
      invalidatesTags: ["Payments", "Report", "Cash"],
    }),

    deletePayment: builder.mutation<void, { messId: string; paymentId: string }>({
      query: ({ messId, paymentId }) => ({
        url: `/api/payments/${messId}/${paymentId}`, method: "DELETE",
      }),
      invalidatesTags: ["Payments", "Report", "Cash"],
    }),

    getCashBalance: builder.query<CashResponse, MonthParams>({
      query:        ({ messId, month, year }) =>
        `/api/payments/${messId}/cash?month=${month}&year=${year}`,
      providesTags: ["Cash"],
    }),

    // ── Reports ───────────────────────────────────────────────────────────────

    getMonthlyReport: builder.query<MonthlyReport, MonthParams>({
      query:        ({ messId, month, year }) =>
        `/api/reports/${messId}/monthly?month=${month}&year=${year}`,
      providesTags: ["Report"],
    }),

    getReportHistory: builder.query<ReportHistoryResponse, string>({
      query: (messId) => `/api/reports/${messId}/history`,
    }),

    sendReminders: builder.mutation<
      { message: string; results: { name: string; sent: boolean }[] },
      MonthParams
    >({
      query: ({ messId, month, year }) => ({
        url:    `/api/reports/${messId}/send-reminders`,
        method: "POST",
        body:   { month, year },
      }),
    }),
  }),
});

export const {
  useGetMyMessQuery,
  useCreateMessMutation,
  useJoinMessMutation,
  useGetMonthlyManagerQuery,
  useAssignMonthlyManagerMutation,
  useGetMealConfigQuery,
  useUpdateMealConfigMutation,
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
