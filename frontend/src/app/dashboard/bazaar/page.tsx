"use client";

import { useEffect, useState } from "react";
import { messApi, bazaarApi } from "@/lib/api";
import Header from "@/components/dashboard/header";
import MonthSelector from "@/components/dashboard/month-selector";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import StatsCard from "@/components/ui/stats-card";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { formatCurrency, formatDate, getCurrentMonthYear } from "@/lib/utils";
import { Mess, Bazaar, MemberRole } from "@/types";
import toast from "react-hot-toast";

export default function BazaarPage() {
  const [mess, setMess] = useState<Mess | null>(null);
  const [role, setRole] = useState<MemberRole>("MEMBER");
  const [bazaars, setBazaars] = useState<Bazaar[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  const [form, setForm] = useState({
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const messData = await messApi.getMy() as { mess: Mess; role: MemberRole };
      setMess(messData.mess);
      setRole(messData.role);

      const data = await bazaarApi.getAll(
        messData.mess.id,
        month,
        year
      ) as { bazaars: Bazaar[]; totalCost: number };
      setBazaars(data.bazaars);
      setTotalCost(data.totalCost);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.amount) e.amount = "Amount is required";
    else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      e.amount = "Enter a valid positive amount";
    if (!form.date) e.date = "Date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mess || !validate()) return;

    setAdding(true);
    try {
      await bazaarApi.add(mess.id, {
        amount: Number(form.amount),
        description: form.description || undefined,
        date: form.date,
      });
      await fetchData();
      setShowAdd(false);
      setForm({ amount: "", description: "", date: new Date().toISOString().split("T")[0] });
      toast.success("Bazaar entry added!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (bazaarId: string) => {
    if (!mess) return;
    if (!confirm("Delete this bazaar entry?")) return;
    try {
      await bazaarApi.delete(mess.id, bazaarId);
      await fetchData();
      toast.success("Bazaar entry deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const isManager = role === "MANAGER" || role === "SUPER_ADMIN";

  return (
    <div className="flex flex-col h-full">
      <Header title="Bazaar" />

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
              Add Bazaar
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatsCard
            title="Total Bazaar Cost"
            value={formatCurrency(totalCost)}
            subtitle="This month"
            icon={ShoppingCart}
            iconColor="text-orange-600"
            iconBg="bg-orange-50"
          />
          <StatsCard
            title="Entries"
            value={bazaars.length}
            subtitle="This month"
            icon={ShoppingCart}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
        </div>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>Bazaar Entries</CardTitle>
            <span className="text-sm font-semibold text-orange-600">
              Total: {formatCurrency(totalCost)}
            </span>
          </CardHeader>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : bazaars.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
              <ShoppingCart size={32} className="opacity-40" />
              <p className="text-sm">No bazaar entries this month</p>
            </div>
          ) : (
            <div className="space-y-1">
              {bazaars.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-orange-50 flex items-center justify-center">
                      <ShoppingCart size={16} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {b.description || "Grocery purchase"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(b.date)} · Added by{" "}
                        {b.addedBy?.name || "Manager"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-orange-600">
                      {formatCurrency(b.amount)}
                    </span>
                    {isManager && (
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Bazaar Entry"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Amount (৳)"
            type="number"
            placeholder="e.g. 850"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            error={errors.amount}
            min="0"
            step="0.01"
          />
          <Input
            label="Description (optional)"
            type="text"
            placeholder="e.g. Vegetables, Fish"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            error={errors.date}
            max={new Date().toISOString().split("T")[0]}
          />
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
              Add Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
