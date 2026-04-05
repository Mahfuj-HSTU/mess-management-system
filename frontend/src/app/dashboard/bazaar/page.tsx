"use client";

import { useState } from "react";
import {
  useGetMyMessQuery,
  useGetBazaarsQuery,
  useAddBazaarMutation,
  useDeleteBazaarMutation,
} from "@/store/api";
import Header from "@/components/dashboard/header";
import MonthSelector from "@/components/dashboard/month-selector";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import StatsCard from "@/components/ui/stats-card";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { formatCurrency, formatDate, getCurrentMonthYear } from "@/lib/utils";
import toast from "react-hot-toast";

const defaultForm = {
  amount:      "",
  description: "",
  date:        new Date().toISOString().split("T")[0],
};

export default function BazaarPage() {
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());
  const [showModal, setShowModal]       = useState(false);
  const [form, setForm]                 = useState(defaultForm);
  const [errors, setErrors]             = useState<Record<string, string>>({});

  // ── Server data ──────────────────────────────────────────────────────────
  const { data: messData } = useGetMyMessQuery();
  const messId    = messData?.mess.id ?? "";
  const role      = messData?.role ?? "MEMBER";
  const isManager = role === "MANAGER" || role === "SUPER_ADMIN";

  const { data, isLoading } = useGetBazaarsQuery(
    { messId, month, year },
    { skip: !messId }
  );

  const [addBazaar,    { isLoading: adding   }] = useAddBazaarMutation();
  const [deleteBazaar, { isLoading: deleting }] = useDeleteBazaarMutation();

  // ── Handlers ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.amount) e.amount = "Amount is required";
    else if (Number(form.amount) <= 0) e.amount = "Must be a positive number";
    if (!form.date) e.date = "Date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await addBazaar({
        messId,
        amount:      Number(form.amount),
        description: form.description || undefined,
        date:        form.date,
      }).unwrap();
      toast.success("Bazaar entry added!");
      setShowModal(false);
      setForm(defaultForm);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (bazaarId: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await deleteBazaar({ messId, bazaarId }).unwrap();
      toast.success("Entry deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Bazaar" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthSelector month={month} year={year} onChange={(m, y) => setMonthYear({ month: m, year: y })} />
          {isManager && (
            <Button onClick={() => setShowModal(true)}>
              <Plus size={16} /> Add Bazaar
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatsCard
            title="Total Cost"
            value={formatCurrency(data?.totalCost ?? 0)}
            subtitle="This month"
            icon={ShoppingCart}
            iconColor="text-orange-600"
            iconBg="bg-orange-50"
          />
          <StatsCard
            title="Entries"
            value={data?.bazaars.length ?? 0}
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
              Total: {formatCurrency(data?.totalCost ?? 0)}
            </span>
          </CardHeader>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !data?.bazaars.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
              <ShoppingCart size={32} className="opacity-40" />
              <p className="text-sm">No bazaar entries this month</p>
            </div>
          ) : (
            <div className="space-y-1">
              {data.bazaars.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-orange-50 flex items-center justify-center">
                      <ShoppingCart size={16} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {b.description || "Grocery purchase"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(b.date)} · Added by {b.addedBy?.name ?? "Manager"}
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
                        disabled={deleting}
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

      {/* Add modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Bazaar Entry">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Amount (৳)"
            type="number"
            placeholder="e.g. 850"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            error={errors.amount}
          />
          <Input
            label="Description (optional)"
            placeholder="e.g. Vegetables, Fish"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            error={errors.date}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={adding} className="flex-1">Add Entry</Button>
          </div>
        </form>
      </Modal>
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
