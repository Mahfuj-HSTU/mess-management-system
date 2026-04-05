"use client";

import { useEffect, useState } from "react";
import { messApi, reportApi } from "@/lib/api";
import Header from "@/components/dashboard/header";
import MonthSelector from "@/components/dashboard/month-selector";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import StatsCard from "@/components/ui/stats-card";
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Mail,
  ShoppingCart,
  UtensilsCrossed,
  Wallet,
  History,
} from "lucide-react";
import { formatCurrency, getCurrentMonthYear } from "@/lib/utils";
import { Mess, MonthlyReport, MemberRole, ReportHistoryItem } from "@/types";
import toast from "react-hot-toast";

export default function ReportsPage() {
  const [mess, setMess] = useState<Mess | null>(null);
  const [role, setRole] = useState<MemberRole>("MEMBER");
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());
  const [loading, setLoading] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const messData = await messApi.getMy() as { mess: Mess; role: MemberRole };
      setMess(messData.mess);
      setRole(messData.role);

      const [reportData, historyData] = await Promise.all([
        reportApi.getMonthly(messData.mess.id, month, year) as Promise<MonthlyReport>,
        reportApi.getHistory(messData.mess.id) as Promise<{ history: ReportHistoryItem[] }>,
      ]);
      setReport(reportData);
      setHistory(historyData.history);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminders = async () => {
    if (!mess) return;
    const dueCount = report?.memberReports.filter((m) => m.due > 0).length || 0;
    if (dueCount === 0) {
      toast("No members have pending dues this month.");
      return;
    }
    if (!confirm(`Send due reminder emails to ${dueCount} member(s)?`)) return;

    setSendingReminders(true);
    try {
      const data = await reportApi.sendReminders(mess.id, month, year) as {
        message: string;
        results: { name: string; sent: boolean }[];
      };
      const sent = data.results.filter((r) => r.sent).length;
      toast.success(`Reminders sent to ${sent} member(s)!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send reminders");
    } finally {
      setSendingReminders(false);
    }
  };

  const isManager = role === "MANAGER" || role === "SUPER_ADMIN";

  return (
    <div className="flex flex-col h-full">
      <Header title="Reports" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthSelector
            month={month}
            year={year}
            onChange={(m, y) => setMonthYear({ month: m, year: y })}
          />
          {isManager && (
            <Button
              variant="outline"
              onClick={handleSendReminders}
              loading={sendingReminders}
            >
              <Mail size={16} />
              Send Due Reminders
            </Button>
          )}
        </div>

        {/* Summary stats */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-xl animate-pulse border border-gray-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard
              title="Total Bazaar"
              value={formatCurrency(report?.totalBazaarCost || 0)}
              icon={ShoppingCart}
              iconColor="text-orange-600"
              iconBg="bg-orange-50"
            />
            <StatsCard
              title="Total Meals"
              value={report?.totalMeals || 0}
              icon={UtensilsCrossed}
              iconColor="text-green-600"
              iconBg="bg-green-50"
            />
            <StatsCard
              title="Meal Rate"
              value={formatCurrency(report?.mealRate || 0)}
              subtitle="Per meal"
              icon={Wallet}
              iconColor="text-primary-600"
              iconBg="bg-primary-50"
              className="col-span-2 lg:col-span-1"
            />
          </div>
        )}

        {/* Report table */}
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
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                    Member
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Meals
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Meal Cost
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Paid
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400">
                      Loading...
                    </td>
                  </tr>
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
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                            {m.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {m.name}
                            </p>
                            <p className="text-xs text-gray-400">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-700">
                        {m.totalMeals}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-700">
                        {formatCurrency(m.mealCost)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-700">
                        {formatCurrency(m.totalPaid)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {m.due > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="flex items-center gap-1 text-sm font-bold text-red-600">
                              <TrendingDown size={14} />
                              {formatCurrency(m.due)}
                            </span>
                            <span className="text-xs text-red-400">Due</span>
                          </div>
                        ) : m.due < 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="flex items-center gap-1 text-sm font-bold text-green-600">
                              <TrendingUp size={14} />
                              {formatCurrency(Math.abs(m.due))}
                            </span>
                            <span className="text-xs text-green-400">Advance</span>
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-gray-400">
                            Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Footer totals */}
              {report && report.memberReports.length > 0 && (
                <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                  <tr>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-700">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      {report.totalMeals}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      {formatCurrency(report.totalBazaarCost)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      {formatCurrency(
                        report.memberReports.reduce((s, m) => s + m.totalPaid, 0)
                      )}
                    </td>
                    <td className="px-5 py-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        {/* History */}
        {history.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <History size={18} className="text-gray-400" />
                  Report History
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
