"use client";

import { useEffect, useState } from "react";
import { messApi, reportApi, paymentApi } from "@/lib/api";
import Header from "@/components/dashboard/header";
import StatsCard from "@/components/ui/stats-card";
import MonthSelector from "@/components/dashboard/month-selector";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import {
  Users,
  ShoppingCart,
  UtensilsCrossed,
  Wallet,
  TrendingDown,
  TrendingUp,
  Copy,
  CheckCheck,
} from "lucide-react";
import { formatCurrency, formatDate, getCurrentMonthYear } from "@/lib/utils";
import { Mess, MonthlyReport, MemberRole } from "@/types";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const [mess, setMess] = useState<Mess | null>(null);
  const [role, setRole] = useState<MemberRole>("MEMBER");
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const messData = await messApi.getMy() as { mess: Mess; role: MemberRole };
      setMess(messData.mess);
      setRole(messData.role);

      const reportData = await reportApi.getMonthly(
        messData.mess.id,
        month,
        year
      ) as MonthlyReport;
      setReport(reportData);

      if (
        messData.role === "MANAGER" ||
        messData.role === "SUPER_ADMIN"
      ) {
        try {
          const cashData = await paymentApi.getCash(messData.mess.id) as { balance: number };
          setCashBalance(cashData.balance);
        } catch {
          // ignore
        }
      }
    } catch {
      // handled in layout
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (!mess) return;
    navigator.clipboard.writeText(mess.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
    toast.success("Mess code copied!");
  };

  const isManager = role === "MANAGER" || role === "SUPER_ADMIN";

  return (
    <div className="flex flex-col h-full">
      <Header title="Overview" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        {/* Mess code banner */}
        {mess && (
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-4 lg:p-5 text-white flex items-center justify-between">
            <div>
              <p className="text-primary-200 text-sm font-medium">
                {mess.name}
              </p>
              <p className="text-2xl font-bold font-mono tracking-wider mt-0.5">
                {mess.code}
              </p>
              <p className="text-primary-200 text-xs mt-1">
                Share this code with members to join
              </p>
            </div>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-3 py-2 text-sm font-medium"
            >
              {codeCopied ? (
                <CheckCheck size={16} />
              ) : (
                <Copy size={16} />
              )}
              {codeCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        {/* Month selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">
            Monthly Summary
          </h2>
          <MonthSelector
            month={month}
            year={year}
            onChange={(m, y) => setMonthYear({ month: m, year: y })}
          />
        </div>

        {/* Stats grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-28 bg-white rounded-xl border border-gray-200 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Members"
              value={mess?.members.length || 0}
              icon={Users}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
            />
            <StatsCard
              title="Total Bazaar"
              value={formatCurrency(report?.totalBazaarCost || 0)}
              subtitle={`${report?.monthName} ${report?.year}`}
              icon={ShoppingCart}
              iconColor="text-orange-600"
              iconBg="bg-orange-50"
            />
            <StatsCard
              title="Total Meals"
              value={report?.totalMeals || 0}
              subtitle={`Rate: ${formatCurrency(report?.mealRate || 0)}/meal`}
              icon={UtensilsCrossed}
              iconColor="text-green-600"
              iconBg="bg-green-50"
            />
            {isManager && cashBalance !== null ? (
              <StatsCard
                title="Cash Balance"
                value={formatCurrency(cashBalance)}
                subtitle="Manager's fund"
                icon={Wallet}
                iconColor={cashBalance >= 0 ? "text-emerald-600" : "text-red-600"}
                iconBg={cashBalance >= 0 ? "bg-emerald-50" : "bg-red-50"}
              />
            ) : (
              <StatsCard
                title="Meal Rate"
                value={formatCurrency(report?.mealRate || 0)}
                subtitle="Per meal this month"
                icon={Wallet}
                iconColor="text-purple-600"
                iconBg="bg-purple-50"
              />
            )}
          </div>
        )}

        {/* Member summary table */}
        <Card padding="none">
          <CardHeader className="p-5 pb-0">
            <CardTitle>Member Summary</CardTitle>
            <span className="text-sm text-gray-500">
              {report?.monthName} {report?.year}
            </span>
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
                    Cost
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Paid
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                    Status
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
                    <td colSpan={5} className="text-center py-10 text-gray-400">
                      No data for this month
                    </td>
                  </tr>
                ) : (
                  report.memberReports.map((m) => (
                    <tr key={m.userId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                            {m.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {m.name}
                            </p>
                            <p className="text-xs text-gray-400 capitalize">
                              {m.role.replace("_", " ").toLowerCase()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm text-gray-700">
                        {m.totalMeals}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm text-gray-700">
                        {formatCurrency(m.mealCost)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm text-gray-700">
                        {formatCurrency(m.totalPaid)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {m.due > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                            <TrendingDown size={12} />
                            Due {formatCurrency(m.due)}
                          </span>
                        ) : m.due < 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                            <TrendingUp size={12} />
                            Adv. {formatCurrency(Math.abs(m.due))}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                            Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Members list */}
        <Card>
          <CardHeader>
            <CardTitle>Members ({mess?.members.length || 0})</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {mess?.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-bold">
                    {m.user.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {m.user.name}
                    </p>
                    <p className="text-xs text-gray-400">{m.user.email}</p>
                  </div>
                </div>
                <Badge
                  variant={
                    m.role === "SUPER_ADMIN"
                      ? "purple"
                      : m.role === "MANAGER"
                      ? "info"
                      : "default"
                  }
                >
                  {m.role === "SUPER_ADMIN"
                    ? "Super Admin"
                    : m.role === "MANAGER"
                    ? "Manager"
                    : "Member"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
