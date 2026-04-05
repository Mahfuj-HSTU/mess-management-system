"use client";

import { useState } from "react";
import {
  useGetMyMessQuery,
  useGetMealsQuery,
  useAddMealMutation,
  useDeleteMealMutation,
} from "@/store/api";
import Header from "@/components/dashboard/header";
import MonthSelector from "@/components/dashboard/month-selector";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import Input from "@/components/ui/input";
import { Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { formatDate, getCurrentMonthYear } from "@/lib/utils";
import type { MessMember } from "@/types";
import toast from "react-hot-toast";

// Default form state
const defaultForm = {
  userId:    "",
  date:      new Date().toISOString().split("T")[0],
  breakfast: false,
  lunch:     false,
  dinner:    false,
};

export default function MealsPage() {
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());
  const [showModal, setShowModal]       = useState(false);
  const [form, setForm]                 = useState(defaultForm);

  // ── Server data via RTK Query ─────────────────────────────────────────────
  const { data: messData } = useGetMyMessQuery();
  const messId   = messData?.mess.id ?? "";
  const role     = messData?.role ?? "MEMBER";
  const isManager = role === "MANAGER" || role === "SUPER_ADMIN";

  const { data, isLoading } = useGetMealsQuery(
    { messId, month, year },
    { skip: !messId }
  );

  const [addMeal,    { isLoading: adding   }] = useAddMealMutation();
  const [deleteMeal, { isLoading: deleting }] = useDeleteMealMutation();

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openModal = () => {
    // Pre-select the first member so the dropdown isn't blank
    const firstMember = messData?.mess.members[0]?.userId ?? "";
    setForm({ ...defaultForm, userId: firstMember });
    setShowModal(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.breakfast && !form.lunch && !form.dinner) {
      toast.error("Select at least one meal type");
      return;
    }
    try {
      await addMeal({ messId, ...form }).unwrap();
      toast.success("Meal added!");
      setShowModal(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (mealId: string) => {
    if (!confirm("Delete this meal entry?")) return;
    try {
      await deleteMeal({ messId, mealId }).unwrap();
      toast.success("Meal deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  // Member options for the dropdown
  const memberOptions = (messData?.mess.members ?? []).map((m: MessMember) => ({
    value: m.userId,
    label: m.user.name,
  }));

  return (
    <div className="flex flex-col h-full">
      <Header title="Meals" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthSelector month={month} year={year} onChange={(m, y) => setMonthYear({ month: m, year: y })} />
          {isManager && (
            <Button onClick={openModal}>
              <Plus size={16} /> Add Meal
            </Button>
          )}
        </div>

        {/* Per-member summary */}
        <Card padding="none">
          <CardHeader className="p-5 pb-0">
            <CardTitle>Meal Summary</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Member", "Breakfast", "Lunch", "Dinner", "Total"].map((h, i) => (
                    <th key={h} className={`text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 ${i === 0 ? "text-left pl-5" : "text-center"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : !data?.summary.length ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10">
                      <EmptyState icon={<UtensilsCrossed size={32} />} text="No meals added this month" />
                    </td>
                  </tr>
                ) : (
                  data.summary.map((s) => (
                    <tr key={s.userId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="pl-5 pr-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={s.name} color="green" />
                          <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm text-gray-700">{s.totalBreakfast}</td>
                      <td className="px-4 py-3.5 text-center text-sm text-gray-700">{s.totalLunch}</td>
                      <td className="px-4 py-3.5 text-center text-sm text-gray-700">{s.totalDinner}</td>
                      <td className="px-5 py-3.5 text-center font-semibold text-gray-900">{s.totalMeals}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Detailed entries list */}
        <Card>
          <CardHeader>
            <CardTitle>Meal Entries</CardTitle>
            <span className="text-sm text-gray-500">{data?.meals.length ?? 0} entries</span>
          </CardHeader>
          <div className="space-y-1">
            {data?.meals.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">No entries found</p>
            ) : (
              data?.meals.map((meal) => {
                const member = messData?.mess.members.find((m) => m.userId === meal.userId);
                const types  = [meal.breakfast && "Breakfast", meal.lunch && "Lunch", meal.dinner && "Dinner"]
                  .filter(Boolean).join(", ");

                return (
                  <div key={meal.id} className="flex items-center justify-between py-2.5 px-1 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar name={member?.user.name ?? "?"} color="green" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member?.user.name ?? "Unknown"}</p>
                        <p className="text-xs text-gray-500">{formatDate(meal.date)} · {types}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">
                        {meal.totalMeals} meal{meal.totalMeals !== 1 ? "s" : ""}
                      </span>
                      {isManager && (
                        <button
                          onClick={() => handleDelete(meal.id)}
                          disabled={deleting}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

      </div>

      {/* Add meal modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Meal Entry">
        <form onSubmit={handleAdd} className="space-y-4">
          <Select
            label="Member"
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
            options={memberOptions}
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Meal Types</p>
            <div className="flex gap-4">
              {(["breakfast", "lunch", "dinner"] as const).map((key) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {key}{key === "breakfast" ? " (0.5)" : " (1)"}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={adding} className="flex-1">Add Meal</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Reusable tiny components ─────────────────────────────────────────────────

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <div className={`h-8 w-8 rounded-full bg-${color}-100 flex items-center justify-center text-${color}-700 text-xs font-bold`}>
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-gray-400">
      <div className="opacity-40">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function getErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "data" in err) {
    const e = err as { data?: { error?: string } };
    return e.data?.error ?? "Something went wrong";
  }
  return "Something went wrong";
}
