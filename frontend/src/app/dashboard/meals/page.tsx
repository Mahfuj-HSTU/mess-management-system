"use client";

import { useState } from "react";
import {
  useGetMyMessQuery,
  useGetMonthlyManagerQuery,
  useGetMealConfigQuery,
  useUpdateMealConfigMutation,
  useGetMealsQuery,
  useAddMealMutation,
  useDeleteMealMutation,
} from "@/store/api";
import { useSession } from "@/lib/auth-client";
import Header from "@/components/dashboard/header";
import MonthSelector from "@/components/dashboard/month-selector";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import Input from "@/components/ui/input";
import { Plus, Trash2, UtensilsCrossed, Settings2 } from "lucide-react";
import { formatDate, getCurrentMonthYear } from "@/lib/utils";
import type { MessMember } from "@/types";
import toast from "react-hot-toast";

const defaultMealForm = {
  userId: "", date: new Date().toISOString().split("T")[0],
  breakfast: false, lunch: false, dinner: false,
};

export default function MealsPage() {
  const { data: session }  = useSession();
  const { data: messData } = useGetMyMessQuery();
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [mealForm, setMealForm] = useState(defaultMealForm);

  const messId = messData?.mess.id ?? "";

  // ── Check if current user is the monthly manager ──────────────────────────
  const { data: managerData } = useGetMonthlyManagerQuery(
    { messId, month, year },
    { skip: !messId }
  );
  const isMonthlyManager = managerData?.manager?.userId === session?.user?.id;

  // ── Meal config ───────────────────────────────────────────────────────────
  const { data: configData } = useGetMealConfigQuery(messId, { skip: !messId });
  const config = configData?.config ?? { breakfast: 0, lunch: 1, dinner: 1 };
  const [configForm, setConfigForm] = useState({ breakfast: "0", lunch: "1", dinner: "1" });
  const [updateConfig, { isLoading: savingConfig }] = useUpdateMealConfigMutation();

  // ── Meals data ────────────────────────────────────────────────────────────
  const { data, isLoading } = useGetMealsQuery({ messId, month, year }, { skip: !messId });
  const [addMeal,    { isLoading: adding   }] = useAddMealMutation();
  const [deleteMeal, { isLoading: deleting }] = useDeleteMealMutation();

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openAddModal = () => {
    const firstMember = messData?.mess.members[0]?.userId ?? "";
    setMealForm({ ...defaultMealForm, userId: firstMember });
    setShowAddModal(true);
  };

  const openConfigModal = () => {
    setConfigForm({
      breakfast: String(config.breakfast),
      lunch:     String(config.lunch),
      dinner:    String(config.dinner),
    });
    setShowConfigModal(true);
  };

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealForm.breakfast && !mealForm.lunch && !mealForm.dinner) {
      toast.error("Select at least one meal type");
      return;
    }
    try {
      await addMeal({ messId, ...mealForm }).unwrap();
      toast.success("Meal added!");
      setShowAddModal(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm("Delete this meal entry?")) return;
    try {
      await deleteMeal({ messId, mealId }).unwrap();
      toast.success("Meal deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateConfig({
        messId,
        breakfast: Number(configForm.breakfast),
        lunch:     Number(configForm.lunch),
        dinner:    Number(configForm.dinner),
        month,
        year,
      }).unwrap();
      toast.success("Meal config updated!");
      setShowConfigModal(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const memberOptions = (messData?.mess.members ?? []).map((m: MessMember) => ({
    value: m.userId, label: m.user.name,
  }));

  return (
    <div className="flex flex-col h-full">
      <Header title="Meals" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthSelector month={month} year={year} onChange={(m, y) => setMonthYear({ month: m, year: y })} />
          {isMonthlyManager && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openConfigModal}>
                <Settings2 size={15} /> Meal Config
              </Button>
              <Button onClick={openAddModal}>
                <Plus size={16} /> Add Meal
              </Button>
            </div>
          )}
        </div>

        {/* Meal config info bar */}
        <div className="flex items-center gap-4 text-sm bg-white rounded-xl border border-gray-200 px-4 py-3">
          <span className="text-gray-500 font-medium">Meal values:</span>
          {config.breakfast > 0 && (
            <span className="text-gray-700">Breakfast = <strong>{config.breakfast}</strong></span>
          )}
          <span className="text-gray-700">Lunch = <strong>{config.lunch}</strong></span>
          <span className="text-gray-700">Dinner = <strong>{config.dinner}</strong></span>
          {config.breakfast === 0 && (
            <span className="text-gray-400 text-xs">(Breakfast not counted)</span>
          )}
        </div>

        {/* Monthly manager notice for non-managers */}
        {!isMonthlyManager && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            {managerData?.manager
              ? `${managerData.manager.user.name} is managing meals for this month.`
              : "No manager assigned for this month — contact the super admin."}
          </div>
        )}

        {/* Summary table */}
        <Card padding="none">
          <CardHeader className="p-5 pb-0">
            <CardTitle>Meal Summary</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Member", "Breakfast", "Lunch", "Dinner", "Total Meals"].map((h, i) => (
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
                    <td colSpan={5} className="py-10 text-center">
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
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                            {s.name[0].toUpperCase()}
                          </div>
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

        {/* Entry list */}
        <Card>
          <CardHeader>
            <CardTitle>Meal Entries</CardTitle>
            <span className="text-sm text-gray-500">{data?.meals.length ?? 0} entries</span>
          </CardHeader>
          <div className="space-y-1">
            {!data?.meals.length ? (
              <p className="text-center text-gray-400 text-sm py-6">No entries found</p>
            ) : (
              data.meals.map((meal) => {
                const member = messData?.mess.members.find((m) => m.userId === meal.userId);
                const types  = [meal.breakfast && "Breakfast", meal.lunch && "Lunch", meal.dinner && "Dinner"]
                  .filter(Boolean).join(", ");

                return (
                  <div key={meal.id} className="flex items-center justify-between py-2.5 px-1 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                        {member?.user.name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member?.user.name ?? "Unknown"}</p>
                        <p className="text-xs text-gray-500">{formatDate(meal.date)} · {types}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">
                        {meal.totalMeals} meal{meal.totalMeals !== 1 ? "s" : ""}
                      </span>
                      {isMonthlyManager && (
                        <button
                          onClick={() => handleDeleteMeal(meal.id)}
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
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Meal Entry">
        <form onSubmit={handleAddMeal} className="space-y-4">
          <Select
            label="Member"
            value={mealForm.userId}
            onChange={(e) => setMealForm({ ...mealForm, userId: e.target.value })}
            options={memberOptions}
          />
          <Input
            label="Date"
            type="date"
            value={mealForm.date}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setMealForm({ ...mealForm, date: e.target.value })}
          />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Meal Types</p>
            <div className="space-y-2">
              {config.breakfast > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={mealForm.breakfast}
                    onChange={(e) => setMealForm({ ...mealForm, breakfast: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-gray-700">Breakfast (counts as {config.breakfast})</span>
                </label>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={mealForm.lunch}
                  onChange={(e) => setMealForm({ ...mealForm, lunch: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-gray-700">Lunch (counts as {config.lunch})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={mealForm.dinner}
                  onChange={(e) => setMealForm({ ...mealForm, dinner: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-gray-700">Dinner (counts as {config.dinner})</span>
              </label>
              {config.breakfast === 0 && (
                <p className="text-xs text-gray-400 mt-1">Breakfast is disabled. Enable it in Meal Config.</p>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" loading={adding} className="flex-1">Add Meal</Button>
          </div>
        </form>
      </Modal>

      {/* Meal config modal */}
      <Modal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} title="Configure Meal Values">
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <p className="text-sm text-gray-500">
            Set how many meals each type counts as. Set breakfast to <strong>0</strong> to disable it.
          </p>
          <Input
            label="Breakfast value (0 = disabled)"
            type="number"
            min="0"
            step="0.5"
            value={configForm.breakfast}
            onChange={(e) => setConfigForm({ ...configForm, breakfast: e.target.value })}
            hint="e.g. 0 (disabled), 0.5, or 1"
          />
          <Input
            label="Lunch value"
            type="number"
            min="0.5"
            step="0.5"
            value={configForm.lunch}
            onChange={(e) => setConfigForm({ ...configForm, lunch: e.target.value })}
            hint="e.g. 1 or 0.5"
          />
          <Input
            label="Dinner value"
            type="number"
            min="0.5"
            step="0.5"
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

function getErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "data" in err) {
    return (err as { data?: { error?: string } }).data?.error ?? "Something went wrong";
  }
  return "Something went wrong";
}
