"use client";

import {
  useState, useMemo, useCallback, useEffect, useRef,
} from "react";
import { createPortal } from "react-dom";
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
import { Settings2, UtensilsCrossed, X } from "lucide-react";
import { getCurrentMonthYear } from "@/lib/utils";
import type { Meal, MealConfig, MessMember } from "@/types";
import toast from "react-hot-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_ABBR = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function parseDateStr(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function friendlyDate(s: string) {
  const d = parseDateStr(s);
  return `${DAY_ABBR[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}
function getErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "data" in err)
    return (err as { data?: { error?: string } }).data?.error ?? "Something went wrong";
  return "Something went wrong";
}

// ─── Cell content (compact dots) ─────────────────────────────────────────────

function CellDots({ meal, config }: { meal?: Meal; config: MealConfig }) {
  if (!meal) return <span className="text-gray-200 text-xs select-none">·</span>;
  const hasAnything =
    meal.breakfast || meal.lunch || meal.dinner ||
    meal.guestBreakfast > 0 || meal.guestLunch > 0 || meal.guestDinner > 0;
  if (!hasAnything) return <span className="text-gray-200 text-xs select-none">·</span>;

  const totalGuests = meal.guestBreakfast + meal.guestLunch + meal.guestDinner;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex gap-0.5 items-center">
        {config.breakfast > 0 && meal.breakfast && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
        )}
        {meal.lunch && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />}
        {meal.dinner && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />}
      </div>
      {totalGuests > 0 && (
        <span className="text-orange-500 font-bold leading-none" style={{ fontSize: 9 }}>
          {totalGuests}G
        </span>
      )}
    </div>
  );
}

// ─── Toggle pill ──────────────────────────────────────────────────────────────

function Pill({
  label, color, active, disabled, pending, onClick,
}: {
  label: string; color: string; active: boolean;
  disabled?: boolean; pending?: boolean; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className={[
        "h-9 px-3 rounded-lg text-xs font-bold transition-all select-none border",
        pending  ? "opacity-50 cursor-wait" : "",
        disabled ? "cursor-default" : "cursor-pointer active:scale-95",
        active
          ? `${color} text-white border-transparent shadow-sm`
          : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// ─── Guest counter ────────────────────────────────────────────────────────────

function GuestCounter({
  label, count, disabled, pending, onDec, onInc,
}: {
  label: string; count: number; disabled?: boolean; pending?: boolean;
  onDec: () => void; onInc: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onDec}
          disabled={disabled || pending || count === 0}
          className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm disabled:opacity-30 transition-colors"
        >−</button>
        <span className={`w-6 text-center text-sm font-bold ${count > 0 ? "text-orange-600" : "text-gray-400"}`}>
          {count}
        </span>
        <button
          type="button"
          onClick={onInc}
          disabled={disabled || pending}
          className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm disabled:opacity-30 transition-colors"
        >+</button>
      </div>
    </div>
  );
}

// ─── Edit Popover (portal) ────────────────────────────────────────────────────

interface EditState {
  userId: string;
  date: string;
  x: number;
  y: number;
}

function EditPopover({
  editState, members, mealLookup, config, isManager, pending,
  onToggle, onGuest, onClose,
}: {
  editState: EditState;
  members: MessMember[];
  mealLookup: Record<string, Record<string, Meal>>;
  config: MealConfig;
  isManager: boolean;
  pending: Set<string>;
  onToggle: (userId: string, date: string, field: "breakfast" | "lunch" | "dinner") => void;
  onGuest: (userId: string, date: string, field: "guestBreakfast" | "guestLunch" | "guestDinner", delta: 1 | -1) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { userId, date, x, y } = editState;
  const member = members.find((m) => m.userId === userId);
  const meal   = mealLookup[userId]?.[date];

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    // Slight delay so the opening click doesn't immediately close it
    const t = setTimeout(() => document.addEventListener("mousedown", handle), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handle); };
  }, [onClose]);

  // Close on scroll
  useEffect(() => {
    const handle = () => onClose();
    window.addEventListener("scroll", handle, true);
    return () => window.removeEventListener("scroll", handle, true);
  }, [onClose]);

  if (!member) return null;

  const pk = (field: string) => `${userId}|${date}|${field}`;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: Math.min(y, window.innerHeight - 320),
        left: Math.min(x, window.innerWidth - 272),
        zIndex: 9999,
      }}
      className="w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div>
          <p className="text-sm font-bold text-gray-900">{member.user.name}</p>
          <p className="text-xs text-gray-500">{friendlyDate(date)}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* Member meal toggles */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {isManager ? "Member meals" : "Meals"}
          </p>
          <div className="flex gap-1.5">
            {config.breakfast > 0 && (
              <Pill
                label="Breakfast"
                color="bg-amber-500"
                active={meal?.breakfast ?? false}
                disabled={!isManager}
                pending={pending.has(pk("breakfast"))}
                onClick={() => onToggle(userId, date, "breakfast")}
              />
            )}
            <Pill
              label="Lunch"
              color="bg-sky-500"
              active={meal?.lunch ?? false}
              disabled={!isManager}
              pending={pending.has(pk("lunch"))}
              onClick={() => onToggle(userId, date, "lunch")}
            />
            <Pill
              label="Dinner"
              color="bg-purple-500"
              active={meal?.dinner ?? false}
              disabled={!isManager}
              pending={pending.has(pk("dinner"))}
              onClick={() => onToggle(userId, date, "dinner")}
            />
          </div>
        </div>

        {/* Guest meals */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Guest meals
          </p>
          <div className="space-y-2">
            {config.breakfast > 0 && (
              <GuestCounter
                label="Breakfast"
                count={meal?.guestBreakfast ?? 0}
                disabled={!isManager}
                pending={pending.has(pk("guestBreakfast"))}
                onDec={() => onGuest(userId, date, "guestBreakfast", -1)}
                onInc={() => onGuest(userId, date, "guestBreakfast", 1)}
              />
            )}
            <GuestCounter
              label="Lunch"
              count={meal?.guestLunch ?? 0}
              disabled={!isManager}
              pending={pending.has(pk("guestLunch"))}
              onDec={() => onGuest(userId, date, "guestLunch", -1)}
              onInc={() => onGuest(userId, date, "guestLunch", 1)}
            />
            <GuestCounter
              label="Dinner"
              count={meal?.guestDinner ?? 0}
              disabled={!isManager}
              pending={pending.has(pk("guestDinner"))}
              onDec={() => onGuest(userId, date, "guestDinner", -1)}
              onInc={() => onGuest(userId, date, "guestDinner", 1)}
            />
          </div>
        </div>

        {/* Total */}
        {(meal?.totalMeals ?? 0) > 0 && (
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Total today</span>
            <span className="text-sm font-bold text-gray-900">{meal!.totalMeals}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MealsPage() {
  const { data: session }  = useSession();
  const { data: messData } = useGetMyMessQuery();
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({ breakfast: "0", lunch: "1", dinner: "1" });
  const [editState, setEditState]   = useState<EditState | null>(null);
  const [pending, setPending]       = useState<Set<string>>(new Set());
  const [isMounted, setIsMounted]   = useState(false);

  useEffect(() => setIsMounted(true), []);

  const messId = messData?.mess.id ?? "";

  const { data: managerData } = useGetMonthlyManagerQuery(
    { messId, month, year }, { skip: !messId }
  );
  const isMonthlyManager = managerData?.manager?.userId === session?.user?.id;

  const { data: configData } = useGetMealConfigQuery(messId, { skip: !messId });
  const config = configData?.config ?? { breakfast: 0, lunch: 1, dinner: 1 };
  const [updateConfig, { isLoading: savingConfig }] = useUpdateMealConfigMutation();

  const { data, isLoading } = useGetMealsQuery({ messId, month, year }, { skip: !messId });
  const [addMeal] = useAddMealMutation();

  // mealLookup[userId][dateStr] = Meal
  const mealLookup = useMemo<Record<string, Record<string, Meal>>>(() => {
    const out: Record<string, Record<string, Meal>> = {};
    for (const meal of data?.meals ?? []) {
      const ds = meal.date.split("T")[0];
      (out[meal.userId] ??= {})[ds] = meal;
    }
    return out;
  }, [data?.meals]);

  const daysInMonth = useMemo(() => {
    return Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1);
  }, [month, year]);

  const setPendingKey = (key: string, on: boolean) =>
    setPending((prev) => { const s = new Set(prev); on ? s.add(key) : s.delete(key); return s; });

  const handleToggle = useCallback(
    async (userId: string, date: string, field: "breakfast" | "lunch" | "dinner") => {
      const key = `${userId}|${date}|${field}`;
      if (pending.has(key)) return;
      const m = mealLookup[userId]?.[date];
      const next = {
        breakfast:      m?.breakfast      ?? false,
        lunch:          m?.lunch          ?? false,
        dinner:         m?.dinner         ?? false,
        guestBreakfast: m?.guestBreakfast ?? 0,
        guestLunch:     m?.guestLunch     ?? 0,
        guestDinner:    m?.guestDinner    ?? 0,
      };
      next[field] = !next[field];
      setPendingKey(key, true);
      try {
        await addMeal({ messId, userId, date, ...next }).unwrap();
      } catch (err) { toast.error(getErrorMessage(err)); }
      finally { setPendingKey(key, false); }
    },
    [addMeal, messId, mealLookup, pending]
  );

  const handleGuest = useCallback(
    async (
      userId: string, date: string,
      field: "guestBreakfast" | "guestLunch" | "guestDinner",
      delta: 1 | -1,
    ) => {
      const key = `${userId}|${date}|${field}`;
      if (pending.has(key)) return;
      const m = mealLookup[userId]?.[date];
      const guests = {
        guestBreakfast: m?.guestBreakfast ?? 0,
        guestLunch:     m?.guestLunch     ?? 0,
        guestDinner:    m?.guestDinner    ?? 0,
      };
      guests[field] = Math.max(0, guests[field] + delta);
      setPendingKey(key, true);
      try {
        await addMeal({
          messId, userId, date,
          breakfast: m?.breakfast ?? false,
          lunch:     m?.lunch     ?? false,
          dinner:    m?.dinner    ?? false,
          ...guests,
        }).unwrap();
      } catch (err) { toast.error(getErrorMessage(err)); }
      finally { setPendingKey(key, false); }
    },
    [addMeal, messId, mealLookup, pending]
  );

  const handleCellClick = (e: React.MouseEvent, userId: string, date: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setEditState({
      userId, date,
      x: rect.left,
      y: rect.bottom + 6,
    });
  };

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
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const openConfigModal = () => {
    setConfigForm({
      breakfast: String(config.breakfast),
      lunch:     String(config.lunch),
      dinner:    String(config.dinner),
    });
    setShowConfigModal(true);
  };

  // Only show members who opted in (isMember = true)
  const members: MessMember[] = (messData?.mess.members ?? []).filter((m) => m.isMember);

  return (
    <div className="flex flex-col h-full">
      <Header title="Meals" />

      <div className="flex-1 p-4 lg:p-6 space-y-5 overflow-auto">

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthSelector month={month} year={year} onChange={(m, y) => setMonthYear({ month: m, year: y })} />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Meal values:</span>
            {config.breakfast > 0 && (
              <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                B = {config.breakfast}
              </span>
            )}
            <span className="bg-sky-50 text-sky-700 border border-sky-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              L = {config.lunch}
            </span>
            <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              D = {config.dinner}
            </span>
            {isMonthlyManager && (
              <button
                onClick={openConfigModal}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-full px-2.5 py-0.5 text-xs hover:bg-gray-50 transition-colors"
              >
                <Settings2 size={11} /> Config
              </button>
            )}
          </div>
        </div>

        {/* Non-manager notice */}
        {!isMonthlyManager && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-700">
            {managerData?.manager
              ? `${managerData.manager.user.name} is managing meals for this month.`
              : "No manager assigned for this month."}
            {isMonthlyManager ? "" : " Click any cell to view details."}
          </div>
        )}
        {isMonthlyManager && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700">
            You are the manager for this month. Click any cell to edit meals.
          </div>
        )}

        {/* ── Main meal grid ────────────────────────────────────────────── */}
        <Card padding="none">
          <CardHeader className="px-5 pt-4 pb-3">
            <CardTitle>
              <span className="flex items-center gap-2">
                <UtensilsCrossed size={16} className="text-gray-400" />
                {MONTH_NAMES[month - 1]} {year} — Meal Grid
              </span>
            </CardTitle>
            <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
              {config.breakfast > 0 && <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />B</span>}
              <span><span className="inline-block w-2 h-2 rounded-full bg-sky-500 mr-1" />L</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-1" />D</span>
              <span className="text-orange-500 font-semibold">nG = guests</span>
            </div>
          </CardHeader>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !members.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
              <UtensilsCrossed size={32} className="opacity-40" />
              <p className="text-sm">No members to display</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs" style={{ minWidth: "100%" }}>
                <thead>
                  <tr className="border-b border-gray-100">
                    {/* Sticky member name column */}
                    <th className="sticky left-0 bg-white z-10 text-left px-4 py-2.5 font-semibold text-gray-500 min-w-[120px] border-r border-gray-100">
                      Member
                    </th>
                    {daysInMonth.map((d) => {
                      const ds = toDateStr(year, month, d);
                      const dow = parseDateStr(ds).getDay();
                      const isWeekend = dow === 0 || dow === 6;
                      return (
                        <th
                          key={d}
                          className={`text-center px-0.5 py-2 font-semibold min-w-[28px] ${
                            isWeekend ? "text-primary-500" : "text-gray-400"
                          }`}
                        >
                          <div>{d}</div>
                          <div className="text-[9px] font-normal opacity-60">{DAY_ABBR[dow].slice(0, 1)}</div>
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
                    const summary = data?.summary.find((s) => s.userId === member.userId);
                    return (
                      <tr key={member.userId} className="group hover:bg-gray-50/60">
                        <td className="sticky left-0 bg-white group-hover:bg-gray-50/60 z-10 px-4 py-2 border-r border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 shrink-0 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-[10px] font-bold">
                              {member.user.name[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-800 truncate max-w-[80px]">
                              {member.user.name}
                            </span>
                          </div>
                        </td>
                        {daysInMonth.map((d) => {
                          const ds   = toDateStr(year, month, d);
                          const meal = mealLookup[member.userId]?.[ds];
                          const isActive = editState?.userId === member.userId && editState.date === ds;
                          return (
                            <td
                              key={d}
                              onClick={(e) => handleCellClick(e, member.userId, ds)}
                              className={[
                                "text-center py-2 cursor-pointer transition-colors",
                                isActive
                                  ? "bg-primary-50 ring-2 ring-inset ring-primary-400"
                                  : meal && (meal.breakfast || meal.lunch || meal.dinner || meal.guestLunch > 0 || meal.guestDinner > 0)
                                  ? "bg-green-50 hover:bg-green-100"
                                  : "hover:bg-gray-100",
                              ].join(" ")}
                            >
                              <CellDots meal={meal} config={config} />
                            </td>
                          );
                        })}
                        <td className="text-center px-3 py-2 border-l border-gray-100">
                          <span className={`font-bold ${(summary?.totalMeals ?? 0) > 0 ? "text-gray-800" : "text-gray-300"}`}>
                            {summary?.totalMeals ?? 0}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ── Monthly summary ───────────────────────────────────────────── */}
        {(data?.summary.length ?? 0) > 0 && (
          <Card padding="none">
            <CardHeader className="px-5 pt-4 pb-3">
              <CardTitle>Monthly Summary</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Member",
                      ...(config.breakfast > 0 ? ["B","GB"] : []),
                      "L","GL","D","GD","Total"
                    ].map((h, i) => (
                      <th
                        key={h + i}
                        title={h === "GB" ? "Guest Breakfast" : h === "GL" ? "Guest Lunch" : h === "GD" ? "Guest Dinner" : undefined}
                        className={`text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3 ${
                          i === 0 ? "text-left pl-5" : "text-center"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data!.summary.map((s) => (
                    <tr key={s.userId} className="hover:bg-gray-50/50">
                      <td className="pl-5 pr-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                            {s.name[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{s.name}</span>
                        </div>
                      </td>
                      {config.breakfast > 0 && (
                        <>
                          <td className="px-3 py-3 text-center text-gray-600">{s.totalBreakfast}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={s.totalGuestBreakfast > 0 ? "text-orange-600 font-semibold" : "text-gray-300"}>
                              {s.totalGuestBreakfast || "—"}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-3 py-3 text-center text-gray-600">{s.totalLunch}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={s.totalGuestLunch > 0 ? "text-orange-600 font-semibold" : "text-gray-300"}>
                          {s.totalGuestLunch || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600">{s.totalDinner}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={s.totalGuestDinner > 0 ? "text-orange-600 font-semibold" : "text-gray-300"}>
                          {s.totalGuestDinner || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center pr-5 font-bold text-gray-900">{s.totalMeals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* ── Edit popover (portal) ─────────────────────────────────────── */}
      {isMounted && editState && createPortal(
        <EditPopover
          editState={editState}
          members={members}
          mealLookup={mealLookup}
          config={config}
          isManager={isMonthlyManager}
          pending={pending}
          onToggle={handleToggle}
          onGuest={handleGuest}
          onClose={() => setEditState(null)}
        />,
        document.body
      )}

      {/* ── Meal config modal ─────────────────────────────────────────── */}
      <Modal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} title="Configure Meal Values">
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <p className="text-sm text-gray-500">
            Set how many meals each type counts as. Breakfast <strong>0</strong> = disabled.
          </p>
          <Input
            label="Breakfast (0 = disabled)"
            type="number" min="0" step="0.5"
            value={configForm.breakfast}
            onChange={(e) => setConfigForm({ ...configForm, breakfast: e.target.value })}
            hint="e.g. 0 (disabled), 0.5, 1"
          />
          <Input
            label="Lunch value"
            type="number" min="0.5" step="0.5"
            value={configForm.lunch}
            onChange={(e) => setConfigForm({ ...configForm, lunch: e.target.value })}
          />
          <Input
            label="Dinner value"
            type="number" min="0.5" step="0.5"
            value={configForm.dinner}
            onChange={(e) => setConfigForm({ ...configForm, dinner: e.target.value })}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowConfigModal(false)}>Cancel</Button>
            <Button type="submit" loading={savingConfig} className="flex-1">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
