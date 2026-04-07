"use client";

import { useState } from "react";
import {
  useGetMyMessQuery,
  useGetMonthlyManagerQuery,
  useGetPaymentsQuery,
  useAddPaymentMutation,
  useDeletePaymentMutation,
  useGetCashBalanceQuery,
} from "@/store/api";
import { useSession } from "@/lib/auth-client";
import Header from "@/components/dashboard/header";
import MonthSelector from "@/components/dashboard/month-selector";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import StatsCard from "@/components/ui/stats-card";
import { Plus, Trash2, Wallet } from "lucide-react";
import { formatCurrency, formatDate, getCurrentMonthYear } from "@/lib/utils";
import type { MessMember } from "@/types";
import toast from "react-hot-toast";

const defaultForm = {
  memberId: "",
  amount:   "",
  note:     "",
  date:     new Date().toISOString().split("T")[0],
};

export default function PaymentsPage() {
  const { data: session } = useSession();
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());
  const [showModal, setShowModal]       = useState(false);
  const [form, setForm]                 = useState(defaultForm);
  const [errors, setErrors]             = useState<Record<string, string>>({});

  // ── Server data ──────────────────────────────────────────────────────────
  const { data: messData } = useGetMyMessQuery();
  const messId       = messData?.mess.id ?? "";
  const isSuperAdmin = messData?.role === "SUPER_ADMIN";

  const { data: managerData } = useGetMonthlyManagerQuery(
    { messId, month, year },
    { skip: !messId }
  );
  const isMonthlyManager = managerData?.manager?.userId === session?.user?.id;
  const canSeeCash = isMonthlyManager || isSuperAdmin;

  const { data, isLoading } = useGetPaymentsQuery(
    { messId, month, year },
    { skip: !messId }
  );

  // Cash is only fetched for monthly manager and super admin
  const { data: cashData } = useGetCashBalanceQuery(
    { messId, month, year },
    { skip: !messId || !canSeeCash }
  );

  const [addPayment,    { isLoading: adding   }] = useAddPaymentMutation();
  const [deletePayment, { isLoading: deleting }] = useDeletePaymentMutation();

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openModal = () => {
    const firstMember = (messData?.mess.members ?? []).find((m) => m.isMember)?.userId ?? "";
    setForm({ ...defaultForm, memberId: firstMember });
    setShowModal(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.memberId) e.memberId = "Select a member";
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
      await addPayment({
        messId,
        memberId: form.memberId,
        amount:   Number(form.amount),
        note:     form.note || undefined,
        date:     form.date,
      }).unwrap();
      toast.success("Payment recorded!");
      setShowModal(false);
      setForm((f) => ({ ...f, amount: "", note: "" }));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm("Delete this payment?")) return;
    try {
      await deletePayment({ messId, paymentId }).unwrap();
      toast.success("Payment deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  // Only show members who are opted in (isMember = true)
  const activeMembers = (messData?.mess.members ?? []).filter((m: MessMember) => m.isMember);
  const memberOptions = activeMembers.map((m: MessMember) => ({
    value: m.userId,
    label: m.user.name,
  }));

  return (
    <div className="flex flex-col h-full">
      <Header title="Payments" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthSelector month={month} year={year} onChange={(m, y) => setMonthYear({ month: m, year: y })} />
          {isMonthlyManager && (
            <Button onClick={openModal}>
              <Plus size={16} /> Record Payment
            </Button>
          )}
        </div>

        {/* Manager notice for non-managers */}
        {!isMonthlyManager && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            {managerData?.manager
              ? `${managerData.manager.user.name} is managing payments for this month.`
              : "No manager assigned for this month — contact the super admin."}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatsCard
            title="Total Collected"
            value={formatCurrency(data?.totalPayments ?? 0)}
            subtitle="This month"
            icon={Wallet}
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
              title="Transactions"
              value={data?.payments.length ?? 0}
              subtitle="This month"
              icon={Wallet}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
            />
          )}
        </div>

        {/* Payment list */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <span className="text-sm font-semibold text-green-600">
              {formatCurrency(data?.totalPayments ?? 0)}
            </span>
          </CardHeader>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !data?.payments.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
              <Wallet size={32} className="opacity-40" />
              <p className="text-sm">No payments recorded this month</p>
            </div>
          ) : (
            <div className="space-y-1">
              {data.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-xs font-bold">
                      {p.member?.name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.member?.name ?? "Unknown"}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(p.date)}{p.note ? ` · ${p.note}` : ""} · by {p.addedBy?.name ?? "Manager"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-green-600">
                      +{formatCurrency(p.amount)}
                    </span>
                    {isMonthlyManager && (
                      <button
                        onClick={() => handleDelete(p.id)}
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

      {/* Add payment modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Payment">
        <form onSubmit={handleAdd} className="space-y-4">
          <Select
            label="Member"
            value={form.memberId}
            onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            options={memberOptions}
            error={errors.memberId}
          />
          <Input
            label="Amount (৳)"
            type="number"
            placeholder="e.g. 2500"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            error={errors.amount}
          />
          <Input
            label="Note (optional)"
            placeholder="e.g. Partial payment"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
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
            <Button type="submit" loading={adding} className="flex-1">Record Payment</Button>
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
