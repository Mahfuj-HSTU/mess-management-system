"use client";

import { useState } from "react";
import {
  useGetMyMessQuery,
  useGetMonthlyManagerQuery,
  useGetMonthlyReportQuery,
  useGetReportHistoryQuery,
  useSendRemindersMutation,
} from "@/store/api";
import { useSession } from "@/lib/auth-client";
import Header from "@/components/dashboard/header";
import MonthSelector from "@/components/dashboard/month-selector";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import StatsCard from "@/components/ui/stats-card";
import { BarChart3, TrendingDown, TrendingUp, Mail, ShoppingCart, UtensilsCrossed, Wallet, History } from "lucide-react";
import { formatCurrency, getCurrentMonthYear } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ReportsPage() {
  const { data: session } = useSession();
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());

  // ── Server data ──────────────────────────────────────────────────────────
  const { data: messData }   = useGetMyMessQuery();
  const messId = messData?.mess.id ?? "";

  const { data: managerData } = useGetMonthlyManagerQuery(
    { messId, month, year },
    { skip: !messId }
  );
  const isMonthlyManager = managerData?.manager?.userId === session?.user?.id;

  const { data: report, isLoading: reportLoading } = useGetMonthlyReportQuery(
    { messId, month, year },
    { skip: !messId }
  );

  const { data: historyData } = useGetReportHistoryQuery(messId, { skip: !messId });
  const history = historyData?.history ?? [];

  const [sendReminders, { isLoading: sending }] = useSendRemindersMutation();

  // ── Send due reminders ────────────────────────────────────────────────────
  const handleSendReminders = async () => {
    if (!messId) return;
    const dueCount = report?.memberReports.filter((m) => m.due > 0).length ?? 0;
    if (dueCount === 0) {
      toast("No members have pending dues this month.");
      return;
    }
    if (!confirm(`Send due reminder emails to ${dueCount} member(s)?`)) return;
    try {
      const result = await sendReminders({ messId, month, year }).unwrap();
      const sent = result.results.filter((r) => r.sent).length;
      toast.success(`Reminders sent to ${sent} member(s)!`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Reports" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthSelector month={month} year={year} onChange={(m, y) => setMonthYear({ month: m, year: y })} />
          {isMonthlyManager && (
            <Button variant="outline" onClick={handleSendReminders} loading={sending}>
              <Mail size={16} /> Send Due Reminders
            </Button>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="Total Bazaar"
            value={formatCurrency(report?.totalBazaarCost ?? 0)}
            icon={ShoppingCart}
            iconColor="text-orange-600"
            iconBg="bg-orange-50"
          />
          <StatsCard
            title="Total Meals"
            value={report?.totalMeals ?? 0}
            icon={UtensilsCrossed}
            iconColor="text-green-600"
            iconBg="bg-green-50"
          />
          <StatsCard
            title="Meal Rate"
            value={formatCurrency(report?.mealRate ?? 0)}
            subtitle="Per meal"
            icon={Wallet}
            iconColor="text-primary-600"
            iconBg="bg-primary-50"
            className="col-span-2 lg:col-span-1"
          />
        </div>

        {/* Monthly report table */}
        <Card padding="none">
          <CardHeader className="p-5 pb-0">
            <CardTitle>
              <span className="flex items-center gap-2">
                <BarChart3 size={18} className="text-gray-400" />
                {report?.monthName} {report?.year} Report
              </span>
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Member", "Meals", "Meal Cost", "Paid", "Balance"].map((h, i) => (
                    <th key={h} className={`text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 ${i === 0 ? "text-left pl-5" : "text-right"} ${i === 4 ? "pr-5" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reportLoading ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : !report?.memberReports.length ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <BarChart3 size={32} className="opacity-40" />
                        <p className="text-sm">No data for this month</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  report.memberReports.map((m) => (
                    <tr key={m.userId} className="hover:bg-gray-50/50">
                      <td className="pl-5 pr-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                            {m.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{m.name}</p>
                            <p className="text-xs text-gray-400">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-700">{m.totalMeals}</td>
                      <td className="px-4 py-4 text-right text-sm text-gray-700">{formatCurrency(m.mealCost)}</td>
                      <td className="px-4 py-4 text-right text-sm text-gray-700">{formatCurrency(m.totalPaid)}</td>
                      <td className="pl-4 pr-5 py-4 text-right">
                        <BalanceCell due={m.due} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Totals footer */}
              {report && report.memberReports.length > 0 && (
                <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                  <tr>
                    <td className="pl-5 py-3 text-sm font-semibold text-gray-700">Total</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700">{report.totalMeals}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700">{formatCurrency(report.totalBazaarCost)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      {formatCurrency(report.memberReports.reduce((s, m) => s + m.totalPaid, 0))}
                    </td>
                    <td className="pr-5 py-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        {/* History quick-nav */}
        {history.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <History size={18} className="text-gray-400" /> Report History
                </span>
              </CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {history.map((h) => (
                <button
                  key={`${h.year}-${h.month}`}
                  onClick={() => setMonthYear({ month: h.month, year: h.year })}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    h.month === month && h.year === year
                      ? "bg-primary-600 text-white"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {h.monthName} {h.year}
                </button>
              ))}
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}

// ─── Small helper components ──────────────────────────────────────────────────

function BalanceCell({ due }: { due: number }) {
  if (due > 0) {
    return (
      <div className="flex flex-col items-end">
        <span className="flex items-center gap-1 text-sm font-bold text-red-600">
          <TrendingDown size={14} /> {formatCurrency(due)}
        </span>
        <span className="text-xs text-red-400">Due</span>
      </div>
    );
  }
  if (due < 0) {
    return (
      <div className="flex flex-col items-end">
        <span className="flex items-center gap-1 text-sm font-bold text-green-600">
          <TrendingUp size={14} /> {formatCurrency(Math.abs(due))}
        </span>
        <span className="text-xs text-green-400">Advance</span>
      </div>
    );
  }
  return <span className="text-sm font-semibold text-gray-400">Settled</span>;
}

function getErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "data" in err) {
    const e = err as { data?: { error?: string } };
    return e.data?.error ?? "Something went wrong";
  }
  return "Something went wrong";
}
