"use client";

import { useEffect, useState } from "react";
import { messApi, paymentApi } from "@/lib/api";
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
import { Mess, Payment, MemberRole, MessMember } from "@/types";
import toast from "react-hot-toast";

export default function PaymentsPage() {
  const [mess, setMess] = useState<Mess | null>(null);
  const [role, setRole] = useState<MemberRole>("MEMBER");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalPayments, setTotalPayments] = useState(0);
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  const [form, setForm] = useState({
    memberId: "",
    amount: "",
    note: "",
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

      const data = await paymentApi.getAll(
        messData.mess.id,
        month,
        year
      ) as { payments: Payment[]; totalPayments: number };
      setPayments(data.payments);
      setTotalPayments(data.totalPayments);

      if (messData.role === "MANAGER" || messData.role === "SUPER_ADMIN") {
        const cashData = await paymentApi.getCash(messData.mess.id) as { balance: number };
        setCashBalance(cashData.balance);
      }

      if (!form.memberId && messData.mess.members.length > 0) {
        setForm((f) => ({ ...f, memberId: messData.mess.members[0].userId }));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.memberId) e.memberId = "Select a member";
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
      await paymentApi.add(mess.id, {
        memberId: form.memberId,
        amount: Number(form.amount),
        note: form.note || undefined,
        date: form.date,
      });
      await fetchData();
      setShowAdd(false);
      setForm((f) => ({ ...f, amount: "", note: "" }));
      toast.success("Payment recorded!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add payment");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!mess) return;
    if (!confirm("Delete this payment?")) return;
    try {
      await paymentApi.delete(mess.id, paymentId);
      await fetchData();
      toast.success("Payment deleted");
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
      <Header title="Payments" />

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
              Record Payment
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatsCard
            title="Total Collected"
            value={formatCurrency(totalPayments)}
            subtitle="This month"
            icon={Wallet}
            iconColor="text-green-600"
            iconBg="bg-green-50"
          />
          {isManager && cashBalance !== null ? (
            <StatsCard
              title="Cash Balance"
              value={formatCurrency(cashBalance)}
              subtitle="Manager's fund"
              icon={Wallet}
              iconColor={cashBalance >= 0 ? "text-emerald-600" : "text-red-600"}
              iconBg={cashBalance >= 0 ? "bg-emerald-50" : "bg-red-50"}
            />
          ) : (
            <StatsCard
              title="Transactions"
              value={payments.length}
              subtitle="This month"
              icon={Wallet}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
            />
          )}
        </div>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <span className="text-sm font-semibold text-green-600">
              {formatCurrency(totalPayments)}
            </span>
          </CardHeader>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
              <Wallet size={32} className="opacity-40" />
              <p className="text-sm">No payments recorded this month</p>
            </div>
          ) : (
            <div className="space-y-1">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3 px-1 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-xs font-bold">
                      {p.member?.name[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {p.member?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(p.date)}
                        {p.note && ` · ${p.note}`}
                        {` · Added by ${p.addedBy?.name || "Manager"}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-green-600">
                      +{formatCurrency(p.amount)}
                    </span>
                    {isManager && (
                      <button
                        onClick={() => handleDelete(p.id)}
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

      {/* Add Payment Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Record Payment"
      >
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
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            error={errors.amount}
            min="0"
            step="0.01"
          />
          <Input
            label="Note (optional)"
            type="text"
            placeholder="e.g. Partial payment"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
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
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
