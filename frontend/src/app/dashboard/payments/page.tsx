"use client";

import { useState } from "react";
import {
  useGetMyMessQuery,
  useGetMonthlyManagerQuery,
  useGetPaymentsQuery,
  useAddPaymentMutation,
  useDeletePaymentMutation,
  useGetCashBalanceQuery,
  useGetMonthlyConfigQuery,
  useUpdateMonthlyConfigMutation,
  useGetExtraCostsQuery,
  useAddExtraCostMutation,
  useDeleteExtraCostMutation,
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
import { Plus, Trash2, Wallet, Users, Wrench, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency, formatDate, getCurrentMonthYear } from "@/lib/utils";
import type { MessMember } from "@/types";
import toast from "react-hot-toast";

const defaultPayForm = {
  memberId: "", mealAmount: "", fixedAmount: "", note: "",
  date: new Date().toISOString().split("T")[0],
};
const defaultExtraForm = { name: "", amount: "" };

function getErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "data" in err)
    return (err as { data?: { error?: string } }).data?.error ?? "Something went wrong";
  return "Something went wrong";
}

export default function PaymentsPage() {
  const { data: session } = useSession();
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());

  const [showPayModal,   setShowPayModal]   = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [payForm,   setPayForm]   = useState(defaultPayForm);
  const [extraForm, setExtraForm] = useState(defaultExtraForm);
  const [payErrors, setPayErrors] = useState<Record<string, string>>({});

  const [buaOpen,   setBuaOpen]   = useState(true);
  const [extraOpen, setExtraOpen] = useState(true);

  const [editingBua, setEditingBua] = useState(false);
  const [buaForm, setBuaForm] = useState({ perMember: "" });

  // ── Server data ────────────────────────────────────────────────────────────
  const { data: messData } = useGetMyMessQuery();
  const messId       = messData?.mess.id ?? "";
  const isSuperAdmin = messData?.role === "SUPER_ADMIN";

  const { data: managerData } = useGetMonthlyManagerQuery({ messId, month, year }, { skip: !messId });
  const isMonthlyManager = managerData?.manager?.userId === session?.user?.id;
  const canManage  = isMonthlyManager || isSuperAdmin;
  const canSeeCash = isMonthlyManager || isSuperAdmin;

  const { data: payData, isLoading: payLoading } = useGetPaymentsQuery({ messId, month, year }, { skip: !messId });
  const { data: cashData } = useGetCashBalanceQuery({ messId, month, year }, { skip: !messId || !canSeeCash });
  const { data: mcData }   = useGetMonthlyConfigQuery({ messId, month, year }, { skip: !messId });
  const { data: ecData, isLoading: ecLoading } = useGetExtraCostsQuery({ messId, month, year }, { skip: !messId });

  const cfg = mcData?.config;
  const activeMembers  = (messData?.mess.members ?? []).filter((m: MessMember) => m.isMember);
  const memberCount    = activeMembers.length;
  const extraPerMember = memberCount > 0 ? (ecData?.total ?? 0) / memberCount : 0;
  const fixedPerMember = (cfg?.buaPerMember ?? 0) + extraPerMember;

  const [addPayment,      { isLoading: adding   }] = useAddPaymentMutation();
  const [deletePayment,   { isLoading: deleting }] = useDeletePaymentMutation();
  const [updateMCfg,      { isLoading: savingBua }] = useUpdateMonthlyConfigMutation();
  const [addExtraCost,    { isLoading: addingExtra   }] = useAddExtraCostMutation();
  const [deleteExtraCost, { isLoading: deletingExtra }] = useDeleteExtraCostMutation();

  const memberOptions = activeMembers.map((m: MessMember) => ({ value: m.userId, label: m.user.name }));

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openPayModal = () => {
    const first = activeMembers[0]?.userId ?? "";
    // Pre-fill fixed amount from the configured bua+extra per member
    setPayForm({ ...defaultPayForm, memberId: first, fixedAmount: fixedPerMember > 0 ? String(fixedPerMember) : "" });
    setShowPayModal(true);
  };

  const validatePay = () => {
    const e: Record<string, string> = {};
    if (!payForm.memberId) e.memberId = "Select a member";
    const meal  = Number(payForm.mealAmount  || 0);
    const fixed = Number(payForm.fixedAmount || 0);
    if (meal < 0)  e.mealAmount  = "Cannot be negative";
    if (fixed < 0) e.fixedAmount = "Cannot be negative";
    if (meal + fixed <= 0) e.mealAmount = "Total must be greater than 0";
    if (!payForm.date) e.date = "Date is required";
    setPayErrors(e);
    return !Object.keys(e).length;
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePay()) return;
    const mealAmt  = Number(payForm.mealAmount  || 0);
    const fixedAmt = Number(payForm.fixedAmount || 0);
    try {
      await addPayment({
        messId, memberId: payForm.memberId,
        amount:      mealAmt + fixedAmt,
        fixedAmount: fixedAmt,
        note:        payForm.note || undefined,
        date:        payForm.date,
      }).unwrap();
      toast.success("Payment recorded!");
      setShowPayModal(false);
      setPayForm((f) => ({ ...f, mealAmount: "", fixedAmount: fixedPerMember > 0 ? String(fixedPerMember) : "", note: "" }));
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm("Delete this payment?")) return;
    try { await deletePayment({ messId, paymentId: id }).unwrap(); toast.success("Deleted"); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  const openBuaEdit = () => {
    setBuaForm({ perMember: String(cfg?.buaPerMember ?? 0) });
    setEditingBua(true);
  };

  const handleSaveBua = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMCfg({ messId, month, year, buaPerMember: Number(buaForm.perMember) }).unwrap();
      toast.success("Bua bill updated!");
      setEditingBua(false);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleAddExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraForm.name.trim()) { toast.error("Name is required"); return; }
    if (!extraForm.amount || Number(extraForm.amount) <= 0) { toast.error("Enter a positive amount"); return; }
    try {
      await addExtraCost({ messId, name: extraForm.name.trim(), amount: Number(extraForm.amount), month, year }).unwrap();
      toast.success("Added!");
      setShowExtraModal(false);
      setExtraForm(defaultExtraForm);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDeleteExtra = async (costId: string) => {
    if (!confirm("Delete?")) return;
    try { await deleteExtraCost({ messId, costId }).unwrap(); toast.success("Deleted"); }
    catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Payments" />

      <div className="flex-1 p-4 lg:p-6 space-y-5 overflow-auto">

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthSelector month={month} year={year} onChange={(m, y) => setMonthYear({ month: m, year: y })} />
          {isMonthlyManager && (
            <Button onClick={openPayModal}><Plus size={16} /> Record Payment</Button>
          )}
        </div>

        {!canManage && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-700">
            {managerData?.manager ? `${managerData.manager.user.name} is managing payments.` : "No manager assigned."}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Member Payments" value={formatCurrency(payData?.totalPayments ?? 0)} subtitle="This month" icon={Wallet} iconColor="text-green-600" iconBg="bg-green-50" />
          <StatsCard
            title="Bua / Member"
            value={formatCurrency(cfg?.buaPerMember ?? 0)}
            subtitle={memberCount > 0 ? `Total: ${formatCurrency((cfg?.buaPerMember ?? 0) * memberCount)}` : "No members"}
            icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50"
          />
          <StatsCard title="Extra Costs" value={formatCurrency(ecData?.total ?? 0)} subtitle={`÷${memberCount} = ${formatCurrency(extraPerMember)}/member`} icon={Wrench} iconColor="text-orange-600" iconBg="bg-orange-50" />
          {canSeeCash ? (
            <StatsCard title="Cash Balance" value={formatCurrency(cashData?.balance ?? 0)} subtitle="Manager's fund" icon={Wallet}
              iconColor={(cashData?.balance ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}
              iconBg={(cashData?.balance ?? 0) >= 0 ? "bg-emerald-50" : "bg-red-50"} />
          ) : (
            <StatsCard title="Fixed / Member" value={formatCurrency(fixedPerMember)} subtitle="Bua + extra" icon={Wallet} iconColor="text-purple-600" iconBg="bg-purple-50" />
          )}
        </div>

        {/* Fixed charge info banner */}
        {fixedPerMember > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
            <p className="font-semibold text-blue-800">Fixed charge this month</p>
            <div className="mt-1.5 flex flex-wrap gap-4 text-blue-700">
              <span>Bua: <strong>{formatCurrency(cfg?.buaPerMember ?? 0)}</strong>/member</span>
              {extraPerMember > 0 && <span>Extra: <strong>{formatCurrency(extraPerMember)}</strong>/member</span>}
              <span className="text-blue-900 font-bold">Total: {formatCurrency(fixedPerMember)}/member</span>
            </div>
          </div>
        )}

        {/* ── Bua Bill ──────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 cursor-pointer w-full" onClick={() => setBuaOpen((v) => !v)}>
              <Users size={16} className="text-blue-500 shrink-0" />
              <CardTitle>Bua / Maid Bill</CardTitle>
              {buaOpen ? <ChevronUp size={16} className="ml-auto text-gray-400" /> : <ChevronDown size={16} className="ml-auto text-gray-400" />}
            </div>
          </CardHeader>
          {buaOpen && (
            editingBua && canManage ? (
              <form onSubmit={handleSaveBua} className="space-y-3">
                <Input
                  label="Bua bill per member (৳)"
                  type="number" min="0" step="0.01"
                  value={buaForm.perMember}
                  hint={memberCount > 0 ? `Total = ৳${Number(buaForm.perMember || 0) * memberCount} for ${memberCount} members` : ""}
                  onChange={(e) => setBuaForm({ perMember: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditingBua(false)}>Cancel</Button>
                  <Button type="submit" loading={savingBua} className="flex-1">Save</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Per Member</p>
                    <p className="text-base font-bold text-blue-700">{formatCurrency(cfg?.buaPerMember ?? 0)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Members</p>
                    <p className="text-base font-bold text-gray-700">{memberCount}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Total</p>
                    <p className="text-base font-bold text-blue-700">{formatCurrency((cfg?.buaPerMember ?? 0) * memberCount)}</p>
                  </div>
                </div>
                {canManage && (
                  <Button variant="outline" size="sm" onClick={openBuaEdit}>Edit Bua Bill</Button>
                )}
              </div>
            )
          )}
        </Card>

        {/* ── Extra Costs ───────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 cursor-pointer w-full" onClick={() => setExtraOpen((v) => !v)}>
              <Wrench size={16} className="text-orange-500 shrink-0" />
              <CardTitle>Extra Costs</CardTitle>
              <span className="text-xs text-gray-400 ml-1">(gas, lock, cleaning…)</span>
              {extraOpen ? <ChevronUp size={16} className="ml-auto text-gray-400" /> : <ChevronDown size={16} className="ml-auto text-gray-400" />}
            </div>
            {extraOpen && <span className="text-sm font-semibold text-orange-600">{formatCurrency(ecData?.total ?? 0)}</span>}
          </CardHeader>
          {extraOpen && (
            <>
              {ecLoading ? (
                <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
              ) : !ecData?.costs.length ? (
                <p className="text-sm text-gray-400 text-center py-4">No extra costs this month</p>
              ) : (
                <div className="space-y-1">
                  {ecData.costs.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2.5 px-1 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center">
                          <Wrench size={14} className="text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-500">by {c.addedBy?.name ?? "Manager"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-orange-600">{formatCurrency(c.amount)}</span>
                        {canManage && (
                          <button onClick={() => handleDeleteExtra(c.id)} disabled={deletingExtra}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(ecData?.costs.length ?? 0) > 0 && (
                <p className="text-xs text-gray-500 bg-orange-50 rounded-lg px-3 py-2 mt-2">
                  Per member: <strong className="text-orange-700">{formatCurrency(extraPerMember)}</strong>
                  {memberCount > 0 && <span className="text-gray-400"> ({memberCount} members)</span>}
                </p>
              )}
              {canManage && (
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={() => { setExtraForm(defaultExtraForm); setShowExtraModal(true); }}>
                    <Plus size={14} /> Add Extra Cost
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>

        {/* ── Member Payments ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Member Payments</CardTitle>
            <span className="text-sm font-semibold text-green-600">{formatCurrency(payData?.totalPayments ?? 0)}</span>
          </CardHeader>
          {payLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : !payData?.payments.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
              <Wallet size={32} className="opacity-40" />
              <p className="text-sm">No payments recorded this month</p>
            </div>
          ) : (
            <div className="space-y-1">
              {payData.payments.map((p) => (
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
                      {/* Show meal/bua split if both are present */}
                      {p.fixedAmount > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Meal: {formatCurrency(p.amount - p.fixedAmount)} + Bua/Extra: {formatCurrency(p.fixedAmount)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-green-600">+{formatCurrency(p.amount)}</span>
                    {isMonthlyManager && (
                      <button onClick={() => handleDeletePayment(p.id)} disabled={deleting}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
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

      {/* ── Record payment modal ──────────────────────────────────────────── */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Record Payment">
        <form onSubmit={handleAddPayment} className="space-y-4">
          <Select label="Member" value={payForm.memberId}
            onChange={(e) => setPayForm({ ...payForm, memberId: e.target.value })}
            options={memberOptions} error={payErrors.memberId} />

          {/* Two separate amount fields */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Meal Payment (৳)"
              type="number" min="0" step="0.01"
              placeholder="e.g. 2000"
              value={payForm.mealAmount}
              onChange={(e) => setPayForm({ ...payForm, mealAmount: e.target.value })}
              error={payErrors.mealAmount}
            />
            <Input
              label={`Bua+Extra (৳)${fixedPerMember > 0 ? ` [${formatCurrency(fixedPerMember)}]` : ""}`}
              type="number" min="0" step="0.01"
              placeholder={fixedPerMember > 0 ? String(fixedPerMember) : "0"}
              value={payForm.fixedAmount}
              onChange={(e) => setPayForm({ ...payForm, fixedAmount: e.target.value })}
            />
          </div>

          {/* Total preview */}
          {(Number(payForm.mealAmount || 0) + Number(payForm.fixedAmount || 0)) > 0 && (
            <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-gray-900">
                {formatCurrency(Number(payForm.mealAmount || 0) + Number(payForm.fixedAmount || 0))}
              </span>
            </div>
          )}

          <Input label="Note (optional)" placeholder="e.g. Partial payment"
            value={payForm.note}
            onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} />
          <Input label="Date" type="date" value={payForm.date}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
            error={payErrors.date} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowPayModal(false)}>Cancel</Button>
            <Button type="submit" loading={adding} className="flex-1">Record</Button>
          </div>
        </form>
      </Modal>

      {/* ── Add extra cost modal ──────────────────────────────────────────── */}
      <Modal isOpen={showExtraModal} onClose={() => setShowExtraModal(false)} title="Add Extra Cost">
        <form onSubmit={handleAddExtra} className="space-y-4">
          <Input label="Name" placeholder="e.g. Gas, Lock, Cleaning supplies"
            value={extraForm.name}
            onChange={(e) => setExtraForm({ ...extraForm, name: e.target.value })} />
          <Input label="Amount (৳)" type="number" placeholder="e.g. 500" min="0" step="0.01"
            value={extraForm.amount}
            onChange={(e) => setExtraForm({ ...extraForm, amount: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowExtraModal(false)}>Cancel</Button>
            <Button type="submit" loading={addingExtra} className="flex-1">Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
