"use client";

import { useState } from "react";
import {
  useGetMyMessQuery,
  useGetMonthlyManagerQuery,
  useGetMonthlyReportQuery,
  useGetCashBalanceQuery,
} from "@/store/api";
import { useSession } from "@/lib/auth-client";
import Header from "@/components/dashboard/header";
import MonthSelector from "@/components/dashboard/month-selector";
import StatsCard from "@/components/ui/stats-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import {
  Users, ShoppingCart, UtensilsCrossed, Wallet,
  TrendingDown, TrendingUp, Copy, CheckCheck,
} from "lucide-react";
import { formatCurrency, getCurrentMonthYear } from "@/lib/utils";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());
  const [codeCopied, setCodeCopied] = useState(false);

  const { data: messData } = useGetMyMessQuery();
  const messId       = messData?.mess.id ?? "";
  const isSuperAdmin = messData?.role === "SUPER_ADMIN";

  const { data: managerData } = useGetMonthlyManagerQuery(
    { messId, month, year },
    { skip: !messId }
  );
  const isMonthlyManager = managerData?.manager?.userId === session?.user?.id;
  const canSeeCash = isMonthlyManager || isSuperAdmin;

  const { data: report, isLoading: reportLoading } = useGetMonthlyReportQuery(
    { messId, month, year },
    { skip: !messId }
  );

  // Cash balance is only fetched for monthly manager and super admin
  const { data: cashData } = useGetCashBalanceQuery(
    { messId, month, year },
    { skip: !messId || !canSeeCash }
  );

  const copyCode = () => {
    if (!messData) return;
    navigator.clipboard.writeText(messData.mess.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
    toast.success("Mess code copied!");
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Overview" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">

        {/* Invite code banner */}
        {messData && (
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-4 lg:p-5 text-white flex items-center justify-between">
            <div>
              <p className="text-primary-200 text-sm font-medium">{messData.mess.name}</p>
              <p className="text-2xl font-bold font-mono tracking-wider mt-0.5">
                {messData.mess.code}
              </p>
              <p className="text-primary-200 text-xs mt-1">Share to invite members</p>
            </div>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-3 py-2 text-sm font-medium"
            >
              {codeCopied ? <CheckCheck size={16} /> : <Copy size={16} />}
              {codeCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        {/* Month picker */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">Monthly Summary</h2>
          <MonthSelector month={month} year={year} onChange={(m, y) => setMonthYear({ month: m, year: y })} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Members"
            value={messData?.mess.members.length ?? 0}
            icon={Users}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
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
            subtitle={`Rate: ${formatCurrency(report?.mealRate ?? 0)}/meal`}
            icon={UtensilsCrossed}
            iconColor="text-green-600"
            iconBg="bg-green-50"
          />
          {canSeeCash ? (
            <StatsCard
              title="Cash Balance"
              value={formatCurrency(cashData?.balance ?? 0)}
              subtitle="Manager's fund"
              icon={Wallet}
              iconColor={(cashData?.balance ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}
              iconBg={(cashData?.balance ?? 0) >= 0 ? "bg-emerald-50" : "bg-red-50"}
            />
          ) : (
            <StatsCard
              title="Meal Rate"
              value={formatCurrency(report?.mealRate ?? 0)}
              subtitle="Per meal this month"
              icon={Wallet}
              iconColor="text-purple-600"
              iconBg="bg-purple-50"
            />
          )}
        </div>

        {/* Member summary table */}
        <Card padding="none">
          <CardHeader className="p-5 pb-0">
            <CardTitle>Member Summary</CardTitle>
            <span className="text-sm text-gray-500">{report?.monthName} {report?.year}</span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Member", "Meals", "Cost", "Paid", "Status"].map((h, i) => (
                    <th
                      key={h}
                      className={`text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 ${i === 0 ? "text-left pl-5" : "text-right"} ${i === 4 ? "pr-5" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reportLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400">Loading...</td>
                  </tr>
                ) : !report?.memberReports.length ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">
                      No data for this month
                    </td>
                  </tr>
                ) : (
                  report.memberReports.map((m) => (
                    <tr key={m.userId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="pl-5 pr-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                            {m.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{m.name}</p>
                            <p className="text-xs text-gray-400 capitalize">
                              {m.role === "SUPER_ADMIN" ? "Super Admin" : "Member"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm text-gray-700">{m.totalMeals}</td>
                      <td className="px-4 py-3.5 text-right text-sm text-gray-700">{formatCurrency(m.mealCost)}</td>
                      <td className="px-4 py-3.5 text-right text-sm text-gray-700">{formatCurrency(m.totalPaid)}</td>
                      <td className="pl-4 pr-5 py-3.5 text-right">
                        <DueStatus due={m.due} />
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
            <CardTitle>Members ({messData?.mess.members.length ?? 0})</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {messData?.mess.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-bold">
                    {m.user.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                    <p className="text-xs text-gray-400">{m.user.email}</p>
                  </div>
                </div>
                <Badge variant={m.role === "SUPER_ADMIN" ? "purple" : "default"}>
                  {m.role === "SUPER_ADMIN" ? "Super Admin" : "Member"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}

// ─── Small helper component ───────────────────────────────────────────────────

function DueStatus({ due }: { due: number }) {
  if (due > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
        <TrendingDown size={12} /> Due {formatCurrency(due)}
      </span>
    );
  }
  if (due < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
        <TrendingUp size={12} /> Adv. {formatCurrency(Math.abs(due))}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
      Settled
    </span>
  );
}
