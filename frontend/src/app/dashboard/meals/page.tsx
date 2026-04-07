"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useGetMyMessQuery,
  useGetMonthlyManagerQuery,
  useGetMealConfigQuery,
  useUpdateMealConfigMutation,
  useGetMealsQuery,
  useAddMealMutation,
} from "@/store/api";
import { useSession } from "@/lib/auth-client";
import Header from "@/components/dashboard/header";
import MonthSelector from "@/components/dashboard/month-selector";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Settings2, UtensilsCrossed, Users } from "lucide-react";
import { getCurrentMonthYear } from "@/lib/utils";
import type { Meal, MessMember } from "@/types";
import toast from "react-hot-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "data" in err)
    return (err as { data?: { error?: string } }).data?.error ?? "Something went wrong";
  return "Something went wrong";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MealPill({
  label, active, disabled, pending, onClick,
}: {
  label: string; active: boolean; disabled?: boolean; pending?: boolean; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className={[
        "min-w-[2rem] h-8 rounded-lg text-xs font-bold transition-all select-none",
        pending ? "opacity-60 cursor-wait" : disabled ? "cursor-default" : "cursor-pointer",
        active
          ? "bg-green-500 text-white shadow-sm"
          : disabled
          ? "bg-gray-100 text-gray-400"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MealsPage() {
  const { data: session }  = useSession();
  const { data: messData } = useGetMyMessQuery();

  const today = new Date().toISOString().split("T")[0];
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());
  const [selectedDate, setSelectedDate] = useState(today);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm]     = useState({ breakfast: "0", lunch: "1", dinner: "1" });
  // track in-flight requests per "userId|date|field"
  const [pending, setPending] = useState<Set<string>>(new Set());

  const messId = messData?.mess.id ?? "";

  // ── Monthly manager ──────────────────────────────────────────────────────
  const { data: managerData } = useGetMonthlyManagerQuery(
    { messId, month, year }, { skip: !messId }
  );
  const isMonthlyManager = managerData?.manager?.userId === session?.user?.id;

  // ── Meal config ──────────────────────────────────────────────────────────
  const { data: configData } = useGetMealConfigQuery(messId, { skip: !messId });
  const config = configData?.config ?? { breakfast: 0, lunch: 1, dinner: 1 };
  const [updateConfig, { isLoading: savingConfig }] = useUpdateMealConfigMutation();

  // ── Meals ────────────────────────────────────────────────────────────────
  const { data, isLoading } = useGetMealsQuery({ messId, month, year }, { skip: !messId });
  const [addMeal] = useAddMealMutation();

  // Build lookup: mealLookup[userId][dateStr] = Meal
  const mealLookup = useMemo<Record<string, Record<string, Meal>>>(() => {
    const out: Record<string, Record<string, Meal>> = {};
    for (const meal of data?.meals ?? []) {
      const ds = meal.date.split("T")[0];
      (out[meal.userId] ??= {})[ds] = meal;
    }
    return out;
  }, [data?.meals]);

  // Days in the selected month
  const daysInMonth = useMemo(() => {
    const n = new Date(year, month, 0).getDate();
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [month, year]);

  // Keep selectedDate clamped to the displayed month
  const clampedDate = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    if (y === year && m === month) return selectedDate;
    return toDateStr(year, month, 1);
  }, [selectedDate, month, year]);

  // Navigate dates within the month
  const navigateDate = (delta: -1 | 1) => {
    const [y, , d] = clampedDate.split("-").map(Number);
    const max = new Date(year, month, 0).getDate();
    const next = Math.min(max, Math.max(1, d + delta));
    setSelectedDate(toDateStr(y, month, next));
  };

  // ── Toggle / guest handlers ──────────────────────────────────────────────
  const setPendingKey = (key: string, on: boolean) =>
    setPending((prev) => { const s = new Set(prev); on ? s.add(key) : s.delete(key); return s; });

  const handleToggle = useCallback(
    async (userId: string, field: "breakfast" | "lunch" | "dinner") => {
      const key = `${userId}|${clampedDate}|${field}`;
      if (pending.has(key)) return;
      const existing = mealLookup[userId]?.[clampedDate];
      const next = {
        breakfast:  existing?.breakfast  ?? false,
        lunch:      existing?.lunch      ?? false,
        dinner:     existing?.dinner     ?? false,
        guestMeals: existing?.guestMeals ?? 0,
      };
      next[field] = !next[field];
      setPendingKey(key, true);
      try {
        await addMeal({ messId, userId, date: clampedDate, ...next }).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setPendingKey(key, false);
      }
    },
    [addMeal, clampedDate, messId, mealLookup, pending]
  );

  const handleGuest = useCallback(
    async (userId: string, delta: 1 | -1) => {
      const key = `${userId}|${clampedDate}|guest`;
      if (pending.has(key)) return;
      const existing = mealLookup[userId]?.[clampedDate];
      const guestMeals = Math.max(0, (existing?.guestMeals ?? 0) + delta);
      setPendingKey(key, true);
      try {
        await addMeal({
          messId, userId, date: clampedDate,
          breakfast:  existing?.breakfast  ?? false,
          lunch:      existing?.lunch      ?? false,
          dinner:     existing?.dinner     ?? false,
          guestMeals,
        }).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setPendingKey(key, false);
      }
    },
    [addMeal, clampedDate, messId, mealLookup, pending]
  );

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateConfig({
        messId,
        breakfast: Number(configForm.breakfast),
        lunch:     Number(configForm.lunch),
        dinner:    Number(configForm.dinner),
        month, year,
      }).unwrap();
      toast.success("Meal config updated!");
      setShowConfigModal(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openConfigModal = () => {
    setConfigForm({
      breakfast: String(config.breakfast),
      lunch:     String(config.lunch),
      dinner:    String(config.dinner),
    });
    setShowConfigModal(true);
  };

  const members: MessMember[] = messData?.mess.members ?? [];

  return (
    <div className="flex flex-col h-full">
      <Header title="Meals" />

      <div className="flex-1 p-4 lg:p-6 space-y-5 overflow-auto">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthSelector
            month={month} year={year}
            onChange={(m, y) => {
              setMonthYear({ month: m, year: y });
              setSelectedDate(toDateStr(y, m, 1));
            }}
          />
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {config.breakfast > 0 && <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">B={config.breakfast}</span>}
            <span className="bg-sky-50 text-sky-700 border border-sky-200 rounded-full px-2 py-0.5">L={config.lunch}</span>
            <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2 py-0.5">D={config.dinner}</span>
            {isMonthlyManager && (
              <button
                onClick={openConfigModal}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-full px-2.5 py-0.5 hover:bg-gray-50 transition-colors"
              >
                <Settings2 size={12} /> Config
              </button>
            )}
          </div>
        </div>

        {/* Non-manager notice */}
        {!isMonthlyManager && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-700">
            {managerData?.manager
              ? `${managerData.manager.user.name} is managing meals for this month.`
              : "No manager assigned for this month — contact the super admin."}
          </div>
        )}

        {/* ── Date navigator ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
          <button
            onClick={() => navigateDate(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="font-semibold text-gray-800 text-sm">{formatDayLabel(clampedDate)}</p>
            <p className="text-xs text-gray-400">{MONTH_NAMES[month - 1]} {year}</p>
          </div>
          <button
            onClick={() => navigateDate(1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* ── Daily entry grid ─────────────────────────────────────────────── */}
        <Card padding="none">
          <CardHeader className="px-5 pt-4 pb-3">
            <CardTitle>
              <span className="flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                Daily Entry
              </span>
            </CardTitle>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {config.breakfast > 0 && <span className="text-amber-600 font-semibold">B</span>}
              <span className="text-sky-600 font-semibold">L</span>
              <span className="text-purple-600 font-semibold">D</span>
              <span className="text-orange-500 font-semibold">Guest</span>
            </div>
          </CardHeader>

          {isLoading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5">
                  <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                  <div className="flex gap-2">
                    {[...Array(4)].map((__, j) => (
                      <div key={j} className="h-8 w-8 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : !members.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
              <UtensilsCrossed size={32} className="opacity-40" />
              <p className="text-sm">No members found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {members.map((member) => {
                const meal = mealLookup[member.userId]?.[clampedDate];
                const totalToday = meal?.totalMeals ?? 0;
                const guest = meal?.guestMeals ?? 0;
                const guestKey = `${member.userId}|${clampedDate}|guest`;

                return (
                  <div key={member.userId} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                    {/* Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                        {member.user.name[0].toUpperCase()}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{member.user.name}</p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Breakfast */}
                      {config.breakfast > 0 && (
                        <MealPill
                          label="B"
                          active={meal?.breakfast ?? false}
                          disabled={!isMonthlyManager}
                          pending={pending.has(`${member.userId}|${clampedDate}|breakfast`)}
                          onClick={() => handleToggle(member.userId, "breakfast")}
                        />
                      )}
                      {/* Lunch */}
                      <MealPill
                        label="L"
                        active={meal?.lunch ?? false}
                        disabled={!isMonthlyManager}
                        pending={pending.has(`${member.userId}|${clampedDate}|lunch`)}
                        onClick={() => handleToggle(member.userId, "lunch")}
                      />
                      {/* Dinner */}
                      <MealPill
                        label="D"
                        active={meal?.dinner ?? false}
                        disabled={!isMonthlyManager}
                        pending={pending.has(`${member.userId}|${clampedDate}|dinner`)}
                        onClick={() => handleToggle(member.userId, "dinner")}
                      />

                      {/* Guest counter */}
                      <div className="flex items-center gap-0.5 ml-1 bg-orange-50 rounded-lg px-1.5 py-1 border border-orange-100">
                        {isMonthlyManager ? (
                          <button
                            onClick={() => handleGuest(member.userId, -1)}
                            disabled={pending.has(guestKey) || guest === 0}
                            className="w-5 h-5 flex items-center justify-center rounded text-orange-500 hover:bg-orange-100 disabled:opacity-30 transition-colors text-sm font-bold"
                          >−</button>
                        ) : null}
                        <span className="w-5 text-center text-xs font-bold text-orange-600">{guest}</span>
                        {isMonthlyManager ? (
                          <button
                            onClick={() => handleGuest(member.userId, 1)}
                            disabled={pending.has(guestKey)}
                            className="w-5 h-5 flex items-center justify-center rounded text-orange-500 hover:bg-orange-100 disabled:opacity-30 transition-colors text-sm font-bold"
                          >+</button>
                        ) : null}
                        <span className="text-xs text-orange-400 ml-0.5">G</span>
                      </div>

                      {/* Day total */}
                      <div className="ml-1 min-w-[2rem] text-center">
                        <span className={`text-sm font-bold ${totalToday > 0 ? "text-gray-800" : "text-gray-300"}`}>
                          {totalToday > 0 ? totalToday : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Monthly grid (spreadsheet view) ──────────────────────────────── */}
        <Card padding="none">
          <CardHeader className="px-5 pt-4 pb-3">
            <CardTitle>Monthly Grid — {MONTH_NAMES[month - 1]} {year}</CardTitle>
            <p className="text-xs text-gray-400">Click any cell to jump to that date</p>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="sticky left-0 bg-white text-left px-4 py-2 text-gray-500 font-semibold min-w-[130px] z-10 border-r border-gray-100">
                    Member
                  </th>
                  {daysInMonth.map((d) => {
                    const ds = toDateStr(year, month, d);
                    const isSelected = ds === clampedDate;
                    return (
                      <th
                        key={d}
                        className={`text-center px-1 py-2 font-semibold min-w-[28px] cursor-pointer transition-colors ${
                          isSelected ? "bg-primary-600 text-white rounded-t" : "text-gray-400 hover:text-gray-700"
                        }`}
                        onClick={() => setSelectedDate(ds)}
                      >
                        {d}
                      </th>
                    );
                  })}
                  <th className="text-center px-3 py-2 font-semibold text-gray-600 min-w-[52px] border-l border-gray-100">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map((member) => {
                  const memberSummary = data?.summary.find((s) => s.userId === member.userId);
                  return (
                    <tr key={member.userId} className="hover:bg-gray-50/50">
                      <td className="sticky left-0 bg-white px-4 py-2.5 border-r border-gray-100 z-10">
                        <span className="font-medium text-gray-800 truncate block max-w-[120px]">
                          {member.user.name}
                        </span>
                      </td>
                      {daysInMonth.map((d) => {
                        const ds = toDateStr(year, month, d);
                        const meal = mealLookup[member.userId]?.[ds];
                        const val = meal?.totalMeals ?? 0;
                        const isSelected = ds === clampedDate;
                        return (
                          <td
                            key={d}
                            onClick={() => setSelectedDate(ds)}
                            className={`text-center py-2 cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-primary-50 ring-1 ring-inset ring-primary-300"
                                : val > 0
                                ? "bg-green-50 hover:bg-green-100"
                                : "hover:bg-gray-100"
                            }`}
                          >
                            <span className={`font-medium ${val > 0 ? "text-green-700" : "text-gray-300"}`}>
                              {val > 0 ? val : "·"}
                            </span>
                          </td>
                        );
                      })}
                      <td className="text-center px-3 py-2 border-l border-gray-100">
                        <span className="font-bold text-gray-800">{memberSummary?.totalMeals ?? 0}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Monthly summary ──────────────────────────────────────────────── */}
        <Card padding="none">
          <CardHeader className="px-5 pt-4 pb-3">
            <CardTitle>Monthly Summary</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Member", "Breakfast", "Lunch", "Dinner", "Guest", "Total Meals"].map((h, i) => (
                    <th
                      key={h}
                      className={`text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 ${
                        i === 0 ? "text-left pl-5" : "text-center"
                      } ${i === 5 ? "text-right pr-5" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : !data?.summary.length ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <UtensilsCrossed size={32} className="opacity-40" />
                        <p className="text-sm">No meals added this month</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.summary.map((s) => (
                    <tr key={s.userId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="pl-5 pr-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                            {s.name[0].toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center text-gray-600">
                        {config.breakfast > 0 ? s.totalBreakfast : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center text-gray-600">{s.totalLunch}</td>
                      <td className="px-4 py-3.5 text-center text-gray-600">{s.totalDinner}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={s.totalGuestMeals > 0 ? "text-orange-600 font-semibold" : "text-gray-300"}>
                          {s.totalGuestMeals > 0 ? s.totalGuestMeals : "—"}
                        </span>
                      </td>
                      <td className="pr-5 pl-4 py-3.5 text-right font-bold text-gray-900">{s.totalMeals}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>

      {/* ── Meal config modal ─────────────────────────────────────────────── */}
      <Modal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} title="Configure Meal Values">
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <p className="text-sm text-gray-500">
            Set how many meals each type counts as. Set breakfast to <strong>0</strong> to disable it.
          </p>
          <Input
            label="Breakfast (0 = disabled)"
            type="number" min="0" step="0.5"
            value={configForm.breakfast}
            onChange={(e) => setConfigForm({ ...configForm, breakfast: e.target.value })}
            hint="e.g. 0 (disabled), 0.5, or 1"
          />
          <Input
            label="Lunch value"
            type="number" min="0.5" step="0.5"
            value={configForm.lunch}
            onChange={(e) => setConfigForm({ ...configForm, lunch: e.target.value })}
            hint="e.g. 1 or 0.5"
          />
          <Input
            label="Dinner value"
            type="number" min="0.5" step="0.5"
            value={configForm.dinner}
            onChange={(e) => setConfigForm({ ...configForm, dinner: e.target.value })}
            hint="e.g. 1 or 0.5"
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowConfigModal(false)}>Cancel</Button>
            <Button type="submit" loading={savingConfig} className="flex-1">Save Config</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
