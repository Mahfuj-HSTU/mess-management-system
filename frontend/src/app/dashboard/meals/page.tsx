"use client";

import { useEffect, useState } from "react";
import { messApi, mealApi } from "@/lib/api";
import Header from "@/components/dashboard/header";
import MonthSelector from "@/components/dashboard/month-selector";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import Input from "@/components/ui/input";
import { Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { formatDate, getCurrentMonthYear } from "@/lib/utils";
import { Mess, Meal, MealSummary, MemberRole, MessMember } from "@/types";
import toast from "react-hot-toast";

export default function MealsPage() {
  const [mess, setMess] = useState<Mess | null>(null);
  const [role, setRole] = useState<MemberRole>("MEMBER");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [summary, setSummary] = useState<MealSummary[]>([]);
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  const [form, setForm] = useState({
    userId: "",
    date: new Date().toISOString().split("T")[0],
    breakfast: false,
    lunch: false,
    dinner: false,
  });

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const messData = await messApi.getMy() as { mess: Mess; role: MemberRole };
      setMess(messData.mess);
      setRole(messData.role);

      const mealData = await mealApi.getAll(messData.mess.id, month, year) as {
        meals: Meal[];
        summary: MealSummary[];
      };
      setMeals(mealData.meals);
      setSummary(mealData.summary);

      // Default form userId to first member
      if (!form.userId && messData.mess.members.length > 0) {
        setForm((f) => ({ ...f, userId: messData.mess.members[0].userId }));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mess || !form.userId || !form.date) return;
    if (!form.breakfast && !form.lunch && !form.dinner) {
      toast.error("Select at least one meal type");
      return;
    }

    setAdding(true);
    try {
      await mealApi.add(mess.id, form);
      await fetchData();
      setShowAdd(false);
      setForm((f) => ({
        ...f,
        breakfast: false,
        lunch: false,
        dinner: false,
      }));
      toast.success("Meal added!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add meal");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (mealId: string) => {
    if (!mess) return;
    if (!confirm("Delete this meal entry?")) return;
    try {
      await mealApi.delete(mess.id, mealId);
      setMeals((prev) => prev.filter((m) => m.id !== mealId));
      toast.success("Meal deleted");
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const isManager = role === "MANAGER" || role === "SUPER_ADMIN";
  const memberOptions = (mess?.members || []).map((m: MessMember) => ({
    value: m.userId,
    label: m.user.name,
  }));

  return (
    <div className="flex flex-col h-full">
      <Header title="Meals" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthSelector
            month={month}
            year={year}
            onChange={(m, y) => setMonthYear({ month: m, year: y })}
          />
          {isManager && (
            <Button onClick={() => setShowAdd(true)}>
              <Plus size={16} />
              Add Meal
            </Button>
          )}
        </div>

        {/* Summary table */}
        <Card padding="none">
          <CardHeader className="p-5 pb-0">
            <CardTitle>Meal Summary</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                    Member
                  </th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Breakfast
                  </th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Lunch
                  </th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Dinner
                  </th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                    Total
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
                ) : summary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <UtensilsCrossed size={32} className="opacity-40" />
                        <p className="text-sm">No meals added this month</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  summary.map((s) => (
                    <tr key={s.userId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                            {s.name[0].toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm text-gray-700">
                        {s.totalBreakfast}
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm text-gray-700">
                        {s.totalLunch}
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm text-gray-700">
                        {s.totalDinner}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-semibold text-gray-900">
                          {s.totalMeals}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Detailed entries */}
        <Card>
          <CardHeader>
            <CardTitle>Meal Entries</CardTitle>
            <span className="text-sm text-gray-500">{meals.length} entries</span>
          </CardHeader>
          <div className="space-y-1">
            {meals.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">
                No meal entries found
              </p>
            ) : (
              meals.map((meal) => {
                const member = mess?.members.find(
                  (m) => m.userId === meal.userId
                );
                const mealTypes = [
                  meal.breakfast && "Breakfast",
                  meal.lunch && "Lunch",
                  meal.dinner && "Dinner",
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <div
                    key={meal.id}
                    className="flex items-center justify-between py-2.5 px-1 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-xs font-bold">
                        {member?.user.name[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {member?.user.name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(meal.date)} · {mealTypes}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">
                        {meal.totalMeals} meal{meal.totalMeals !== 1 ? "s" : ""}
                      </span>
                      {isManager && (
                        <button
                          onClick={() => handleDelete(meal.id)}
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

      {/* Add Meal Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Meal Entry"
      >
        <form onSubmit={handleAddMeal} className="space-y-4">
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
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            max={new Date().toISOString().split("T")[0]}
          />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Meal Types
            </p>
            <div className="flex gap-3">
              {[
                { key: "breakfast", label: "Breakfast (0.5)" },
                { key: "lunch", label: "Lunch (1)" },
                { key: "dinner", label: "Dinner (1)" },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form[key as "breakfast" | "lunch" | "dinner"]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.checked })
                    }
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={adding} className="flex-1">
              Add Meal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
