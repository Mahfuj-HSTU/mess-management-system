"use client";

import { useState } from "react";
import {
  useGetMyMessQuery,
  useGetMonthlyManagerQuery,
  useGetMonthlyReportQuery,
  useGetReportHistoryQuery,
  useGetMonthlyConfigQuery,
  useUpdateMonthlyConfigMutation,
  useSendRemindersMutation,
} from "@/store/api";
import { useSession } from "@/lib/auth-client";
import Header from "@/components/dashboard/header";
import MonthSelector from "@/components/dashboard/month-selector";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import StatsCard from "@/components/ui/stats-card";
import {
  BarChart3, TrendingDown, TrendingUp, Mail,
  ShoppingCart, UtensilsCrossed, Wallet, History, Moon, Settings2,
} from "lucide-react";
import { formatCurrency, getCurrentMonthYear } from "@/lib/utils";
import toast from "react-hot-toast";

function getErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "data" in err)
    return (err as { data?: { error?: string } }).data?.error ?? "Something went wrong";
  return "Something went wrong";
}

export default function ReportsPage() {
  const { data: session }  = useSession();
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());
  const [showRamadanModal, setShowRamadanModal] = useState(false);
  const [ramadanForm, setRamadanForm] = useState({ hasRamadan: false, ramadanStartDay: "15" });

  const { data: messData }   = useGetMyMessQuery();
  const messId = messData?.mess.id ?? "";
  const isSuperAdmin = messData?.role === "SUPER_ADMIN";

  const { data: managerData } = useGetMonthlyManagerQuery({ messId, month, year }, { skip: !messId });
  const isMonthlyManager = managerData?.manager?.userId === session?.user?.id;
  const canManage = isMonthlyManager || isSuperAdmin;

  const { data: report, isLoading: reportLoading } = useGetMonthlyReportQuery({ messId, month, year }, { skip: !messId });
  const { data: historyData } = useGetReportHistoryQuery(messId, { skip: !messId });
  const { data: mcData }      = useGetMonthlyConfigQuery({ messId, month, year }, { skip: !messId });

  const history = historyData?.history ?? [];

  const [sendReminders,      { isLoading: sending }]       = useSendRemindersMutation();
  const [updateMonthlyConfig, { isLoading: savingRamadan }] = useUpdateMonthlyConfigMutation();

  const handleSendReminders = async () => {
    if (!messId) return;
    const dueCount = report?.memberReports.filter((m) => m.managerGets > 0).length ?? 0;
    if (dueCount === 0) { toast("No members have pending dues."); return; }
    if (!confirm(`Send due reminder emails to ${dueCount} member(s)?`)) return;
    try {
      const result = await sendReminders({ messId, month, year }).unwrap();
      toast.success(`Reminders sent to ${result.results.filter((r) => r.sent).length} member(s)!`);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const openRamadanModal = () => {
    setRamadanForm({
      hasRamadan:      mcData?.config.hasRamadan      ?? false,
      ramadanStartDay: String(mcData?.config.ramadanStartDay ?? 15),
    });
    setShowRamadanModal(true);
  };

  const handleSaveRamadan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMonthlyConfig({
        messId, month, year,
        hasRamadan:      ramadanForm.hasRamadan,
        ramadanStartDay: Number(ramadanForm.ramadanStartDay),
      }).unwrap();
      toast.success("Ramadan settings saved!");
      setShowRamadanModal(false);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const memberCount = report?.memberReports.length ?? 0;

  return (
    <div className="flex flex-col h-full">
      <Header title="Reports" />

      <div className="flex-1 p-4 lg:p-6 space-y-5 overflow-auto">

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthSelector month={month} year={year} onChange={(m, y) => setMonthYear({ month: m, year: y })} />
          <div className="flex gap-2 flex-wrap">
            {canManage && (
              <Button variant="outline" size="sm" onClick={openRamadanModal}>
                <Moon size={14} />
                {report?.hasRamadan ? "Ramadan: ON" : "Ramadan: OFF"}
              </Button>
            )}
            {isMonthlyManager && (
              <Button variant="outline" onClick={handleSendReminders} loading={sending}>
                <Mail size={16} /> Send Reminders
              </Button>
            )}
          </div>
        </div>

        {/* ── Meal summary stats ──────────────────────────────────────────── */}
        {report?.hasRamadan && report.period1 && report.period2 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <div className="p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">মিলের হিসাব-১ (Pre-Ramadan)</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">মোট বাজার</span><span className="font-semibold">{formatCurrency(report.period1.totalBazaar)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">মোট মিল</span><span className="font-semibold">{report.period1.totalMeals}</span></div>
                  <div className="flex justify-between border-t border-gray-100 pt-1 mt-1"><span className="text-gray-600 font-medium">মিল রেট</span><span className="font-bold text-primary-600">{formatCurrency(report.period1.mealRate)}</span></div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Moon size={12} className="text-indigo-400" />মিলের হিসাব-২ (Ramadan)</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">মোট বাজার</span><span className="font-semibold">{formatCurrency(report.period2.totalBazaar)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">মোট মিল</span><span className="font-semibold">{report.period2.totalMeals}</span></div>
                  <div className="flex justify-between border-t border-gray-100 pt-1 mt-1"><span className="text-gray-600 font-medium">মিল রেট</span><span className="font-bold text-primary-600">{formatCurrency(report.period2.mealRate)}</span></div>
                </div>
              </div>
            </Card>
            <div className="col-span-2 lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-4">
              <StatsCard title="Total Bazaar" value={formatCurrency(report.totalBazaarCost)} icon={ShoppingCart} iconColor="text-orange-600" iconBg="bg-orange-50" />
              <StatsCard title="Total Meals" value={report.totalMeals} icon={UtensilsCrossed} iconColor="text-green-600" iconBg="bg-green-50" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard title="Total Bazaar" value={formatCurrency(report?.totalBazaarCost ?? 0)} icon={ShoppingCart} iconColor="text-orange-600" iconBg="bg-orange-50" />
            <StatsCard title="Total Meals" value={report?.totalMeals ?? 0} icon={UtensilsCrossed} iconColor="text-green-600" iconBg="bg-green-50" />
            <StatsCard title="Meal Rate" value={formatCurrency(report?.mealRate ?? 0)} subtitle="Per meal" icon={Wallet} iconColor="text-primary-600" iconBg="bg-primary-50" className="col-span-2 lg:col-span-1" />
          </div>
        )}

        {/* ── Fixed charges summary ────────────────────────────────────────── */}
        {((report?.buaPerMember ?? 0) > 0 || (report?.totalExtraCosts ?? 0) > 0) && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
              <p className="text-xs text-gray-500 mb-0.5">Bua / Member</p>
              <p className="font-bold text-blue-700">{formatCurrency(report?.buaPerMember ?? 0)}</p>
              <p className="text-xs text-gray-400">Total: {formatCurrency(report?.totalBuaBill ?? 0)}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
              <p className="text-xs text-gray-500 mb-0.5">Extra / Member</p>
              <p className="font-bold text-orange-700">{formatCurrency(report?.extraPerMember ?? 0)}</p>
              <p className="text-xs text-gray-400">Total: {formatCurrency(report?.totalExtraCosts ?? 0)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5">Fixed / Member</p>
              <p className="font-bold text-gray-800">{formatCurrency(report?.fixedChargePerMember ?? 0)}</p>
              <p className="text-xs text-gray-400">bua + extra</p>
            </div>
          </div>
        )}

        {/* ── Main report table ────────────────────────────────────────────── */}
        <Card padding="none">
          <CardHeader className="p-5 pb-0">
            <CardTitle>
              <span className="flex items-center gap-2">
                <BarChart3 size={18} className="text-gray-400" />
                {report?.monthName} {report?.year} — Full Report
              </span>
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {/* Member */}
                  <th className="text-left pl-5 pr-3 py-3 font-semibold text-gray-600 min-w-[120px]">Member</th>

                  {/* Meal columns — split if Ramadan */}
                  {report?.hasRamadan ? (
                    <>
                      <th className="px-2 py-3 text-center font-semibold text-gray-500">Meal-1</th>
                      <th className="px-2 py-3 text-center font-semibold text-gray-500">Meal-2</th>
                      <th className="px-2 py-3 text-center font-semibold text-gray-600">Total Meal</th>
                    </>
                  ) : (
                    <th className="px-3 py-3 text-center font-semibold text-gray-600">Total Meal</th>
                  )}
                  <th className="px-3 py-3 text-right font-semibold text-gray-600">Meal Cost</th>

                  {/* Financial */}
                  <th className="px-3 py-3 text-right font-semibold text-gray-600">Total Paid</th>
                  <th className="px-3 py-3 text-right font-semibold text-sky-600">Meal Paid</th>
                  {((report?.fixedChargePerMember ?? 0) > 0) && (
                    <>
                      <th className="px-3 py-3 text-right font-semibold text-blue-600">Fixed Paid</th>
                      <th className="px-3 py-3 text-right font-semibold text-blue-400">Fixed Due</th>
                    </>
                  )}

                  {/* Balance */}
                  <th className="px-3 py-3 text-right font-semibold text-red-500 min-w-[90px]">Manager Gets</th>
                  <th className="pr-5 pl-3 py-3 text-right font-semibold text-green-600 min-w-[90px]">Member Gets</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {reportLoading ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : !report?.memberReports.length ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <BarChart3 size={32} className="opacity-40" />
                        <p className="text-sm">No data for this month</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  report.memberReports.map((m) => (
                    <tr key={m.userId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="pl-5 pr-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold shrink-0">
                            {m.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{m.name}</p>
                            <p className="text-gray-400 text-[10px]">{m.email}</p>
                          </div>
                        </div>
                      </td>

                      {report.hasRamadan ? (
                        <>
                          <td className="px-2 py-3.5 text-center text-gray-600">{m.period1Meals}</td>
                          <td className="px-2 py-3.5 text-center text-gray-600">{m.period2Meals}</td>
                          <td className="px-2 py-3.5 text-center font-semibold text-gray-800">{m.totalMeals}</td>
                        </>
                      ) : (
                        <td className="px-3 py-3.5 text-center font-semibold text-gray-800">{m.totalMeals}</td>
                      )}

                      <td className="px-3 py-3.5 text-right text-gray-700">{formatCurrency(m.mealCost)}</td>
                      <td className="px-3 py-3.5 text-right text-gray-700">{formatCurrency(m.totalPaid)}</td>
                      <td className="px-3 py-3.5 text-right text-sky-700 font-medium">{formatCurrency(m.mealPaid)}</td>

                      {((report?.fixedChargePerMember ?? 0) > 0) && (
                        <>
                          <td className="px-3 py-3.5 text-right text-blue-600 font-medium">{formatCurrency(m.fixedPaid)}</td>
                          <td className="px-3 py-3.5 text-right">
                            {m.fixedDue > 0
                              ? <span className="text-red-500 font-semibold">{formatCurrency(m.fixedDue)}</span>
                              : m.fixedDue < 0
                              ? <span className="text-green-500 font-semibold">{formatCurrency(-m.fixedDue)}</span>
                              : <span className="text-gray-300">✓</span>}
                          </td>
                        </>
                      )}

                      <td className="px-3 py-3.5 text-right">
                        {m.managerGets > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            <TrendingDown size={10} /> {formatCurrency(m.managerGets)}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      <td className="pr-5 pl-3 py-3.5 text-right">
                        {m.memberGets > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <TrendingUp size={10} /> {formatCurrency(m.memberGets)}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Totals footer */}
              {report && report.memberReports.length > 0 && (
                <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                  <tr>
                    <td className="pl-5 py-3 text-sm font-bold text-gray-700">Total</td>
                    {report.hasRamadan ? (
                      <>
                        <td className="px-2 py-3 text-center text-sm font-semibold text-gray-700">
                          {report.memberReports.reduce((s, m) => s + m.period1Meals, 0).toFixed(1)}
                        </td>
                        <td className="px-2 py-3 text-center text-sm font-semibold text-gray-700">
                          {report.memberReports.reduce((s, m) => s + m.period2Meals, 0).toFixed(1)}
                        </td>
                        <td className="px-2 py-3 text-center text-sm font-bold text-gray-800">{report.totalMeals}</td>
                      </>
                    ) : (
                      <td className="px-3 py-3 text-center text-sm font-bold text-gray-800">{report.totalMeals}</td>
                    )}
                    <td className="px-3 py-3 text-right text-sm font-semibold text-gray-700">{formatCurrency(report.totalBazaarCost)}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-gray-700">
                      {formatCurrency(report.memberReports.reduce((s, m) => s + m.totalPaid, 0))}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-sky-700">
                      {formatCurrency(report.memberReports.reduce((s, m) => s + m.mealPaid, 0))}
                    </td>
                    {((report?.fixedChargePerMember ?? 0) > 0) && (
                      <>
                        <td className="px-3 py-3 text-right text-sm font-semibold text-blue-600">
                          {formatCurrency(report.memberReports.reduce((s, m) => s + m.fixedPaid, 0))}
                        </td>
                        <td className="px-3 py-3" />
                      </>
                    )}
                    <td className="px-3 py-3 text-right text-sm font-bold text-red-600">
                      {formatCurrency(report.memberReports.filter((m) => m.managerGets > 0).reduce((s, m) => s + m.managerGets, 0))}
                    </td>
                    <td className="pr-5 pl-3 py-3 text-right text-sm font-bold text-green-600">
                      {formatCurrency(report.memberReports.filter((m) => m.memberGets > 0).reduce((s, m) => s + m.memberGets, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        {/* ── Bua summary (if set) ─────────────────────────────────────────── */}
        {(report?.buaPerMember ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>খালার হিসাব (Maid Account)</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Per Member</p>
                <p className="text-lg font-bold text-blue-700">{formatCurrency(report!.buaPerMember)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Members</p>
                <p className="text-lg font-bold text-gray-700">{memberCount}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Total Bill</p>
                <p className="text-lg font-bold text-blue-700">{formatCurrency(report!.totalBuaBill)}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500 text-center">
              Each member pays ৳{report!.buaPerMember} regardless of meals eaten.
            </p>
          </Card>
        )}

        {/* History */}
        {history.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle><span className="flex items-center gap-2"><History size={18} className="text-gray-400" /> Report History</span></CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {history.map((h) => (
                <button key={`${h.year}-${h.month}`}
                  onClick={() => setMonthYear({ month: h.month, year: h.year })}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    h.month === month && h.year === year
                      ? "bg-primary-600 text-white"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}>
                  {h.monthName} {h.year}
                </button>
              ))}
            </div>
          </Card>
        )}

      </div>

      {/* Ramadan config modal */}
      <Modal isOpen={showRamadanModal} onClose={() => setShowRamadanModal(false)} title="Ramadan / Two-Period Settings">
        <form onSubmit={handleSaveRamadan} className="space-y-4">
          <p className="text-sm text-gray-500">
            Enable this when the month has two different meal periods (e.g. normal + Ramadan).
            Bazaar and meals before the start day use Rate-1; from the start day onwards use Rate-2.
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setRamadanForm((f) => ({ ...f, hasRamadan: !f.hasRamadan }))}
              className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors ${ramadanForm.hasRamadan ? "bg-primary-600" : "bg-gray-200"}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${ramadanForm.hasRamadan ? "translate-x-5" : "translate-x-0"}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">Enable two meal periods</span>
          </label>
          {ramadanForm.hasRamadan && (
            <Input
              label="Period 2 starts on day"
              type="number" min="2" max="28"
              value={ramadanForm.ramadanStartDay}
              onChange={(e) => setRamadanForm({ ...ramadanForm, ramadanStartDay: e.target.value })}
              hint="Days 1 to (N-1) = Period 1. Day N onwards = Period 2."
            />
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowRamadanModal(false)}>Cancel</Button>
            <Button type="submit" loading={savingRamadan} className="flex-1">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
