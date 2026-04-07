"use client";

import { useState } from "react";
import {
  useGetMyMessQuery,
  useGetMonthlyManagerQuery,
  useAssignMonthlyManagerMutation,
  useUpdateMemberStatusMutation,
} from "@/store/api";
import { useSession } from "@/lib/auth-client";
import Header from "@/components/dashboard/header";
import MonthSelector from "@/components/dashboard/month-selector";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Select from "@/components/ui/select";
import { Users, Crown, User, Shield, ChevronRight } from "lucide-react";
import { formatDate, getCurrentMonthYear, MONTHS } from "@/lib/utils";
import type { MemberRole, MessMember } from "@/types";
import toast from "react-hot-toast";

const ROLE_CONFIG: Record<MemberRole, { label: string; badgeVariant: "purple" | "default" }> = {
  SUPER_ADMIN: { label: "Super Admin", badgeVariant: "purple" },
  MEMBER:      { label: "Member",      badgeVariant: "default" },
};

export default function MembersPage() {
  const { data: session }  = useSession();
  const { data: messData } = useGetMyMessQuery();
  const [{ month, year }, setMonthYear] = useState(getCurrentMonthYear());
  const [selectedUserId, setSelectedUserId] = useState("");

  const messId    = messData?.mess.id ?? "";
  const role      = messData?.role    ?? "MEMBER";
  const isSuperAdmin = role === "SUPER_ADMIN";

  // Fetch who the monthly manager is for the selected month
  const { data: managerData, isLoading: managerLoading } = useGetMonthlyManagerQuery(
    { messId, month, year },
    { skip: !messId }
  );
  const currentManager = managerData?.manager;

  const [assignMonthlyManager, { isLoading: assigning }] = useAssignMonthlyManagerMutation();
  const [updateMemberStatus,   { isLoading: togglingMembership }] = useUpdateMemberStatusMutation();

  const mySuperAdminRecord = isSuperAdmin
    ? (messData?.mess.members ?? []).find((m) => m.userId === session?.user?.id)
    : null;

  const handleToggleMembership = async () => {
    if (!messId || !mySuperAdminRecord) return;
    const next = !mySuperAdminRecord.isMember;
    const label = next ? "count yourself as a member" : "remove yourself from meal tracking";
    if (!confirm(`Are you sure you want to ${label}?`)) return;
    try {
      const result = await updateMemberStatus({ messId, isMember: next }).unwrap();
      toast.success(result.message);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !messId) return;

    const member = messData?.mess.members.find((m) => m.userId === selectedUserId);
    if (!confirm(`Assign "${member?.user.name}" as manager for ${MONTHS[month - 1]} ${year}?`)) return;

    try {
      const result = await assignMonthlyManager({ messId, userId: selectedUserId, month, year }).unwrap();
      toast.success(result.message);
      setSelectedUserId("");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  // Only non-super-admin members can be assigned as manager
  const assignableMembers = (messData?.mess.members ?? [])
    .filter((m: MessMember) => m.role !== "SUPER_ADMIN")
    .map((m: MessMember) => ({ value: m.userId, label: m.user.name }));

  return (
    <div className="flex flex-col h-full">
      <Header title="Members" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">

        {/* Invite code banner */}
        {messData && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Invite Code</p>
              <p className="text-2xl font-bold font-mono text-blue-700 tracking-widest">
                {messData.mess.code}
              </p>
            </div>
            <p className="text-sm text-blue-600">Share this code to invite new members</p>
          </div>
        )}

        {/* ── Super admin membership toggle ── */}
        {isSuperAdmin && mySuperAdminRecord && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Crown size={16} className="text-purple-500" />
                  Your Membership Status
                </span>
              </CardTitle>
            </CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Count me as a mess member
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  When enabled, your meals and dues are tracked in reports.
                  Disable if you manage the mess but don't eat from it.
                </p>
              </div>
              <button
                onClick={handleToggleMembership}
                disabled={togglingMembership}
                className={[
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
                  mySuperAdminRecord.isMember ? "bg-primary-600" : "bg-gray-200",
                  togglingMembership ? "opacity-60 cursor-wait" : "",
                ].join(" ")}
              >
                <span
                  className={[
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
                    mySuperAdminRecord.isMember ? "translate-x-5" : "translate-x-0",
                  ].join(" ")}
                />
              </button>
            </div>
            <p className={`mt-3 text-xs font-medium ${mySuperAdminRecord.isMember ? "text-green-600" : "text-gray-400"}`}>
              {mySuperAdminRecord.isMember
                ? "You are currently counted as a member — your meals and dues appear in reports."
                : "You are currently excluded from meal tracking and reports."}
            </p>
          </Card>
        )}

        {/* ── Monthly Manager Assignment (super admin only) ── */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Shield size={18} className="text-primary-500" />
                  Assign Monthly Manager
                </span>
              </CardTitle>
              <MonthSelector month={month} year={year} onChange={(m, y) => setMonthYear({ month: m, year: y })} />
            </CardHeader>

            {/* Current manager for selected month */}
            <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Manager for {MONTHS[month - 1]} {year}
              </p>
              {managerLoading ? (
                <p className="text-sm text-gray-400">Loading...</p>
              ) : currentManager ? (
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                    {currentManager.user.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{currentManager.user.name}</p>
                    <p className="text-xs text-gray-500">{currentManager.user.email}</p>
                  </div>
                  <Badge variant="info" className="ml-auto">Active Manager</Badge>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No manager assigned for this month yet</p>
              )}
            </div>

            {/* Assign form */}
            <form onSubmit={handleAssign} className="flex gap-3 items-end">
              <div className="flex-1">
                <Select
                  label="Select Member to Assign"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  options={[{ value: "", label: "— Choose a member —" }, ...assignableMembers]}
                />
              </div>
              <Button type="submit" loading={assigning} disabled={!selectedUserId} className="shrink-0">
                <ChevronRight size={16} />
                Assign
              </Button>
            </form>

            <p className="mt-3 text-xs text-gray-400">
              Each month can have one manager. Assigning a new manager for the same month will
              replace the previous one — they lose manager access for that month only.
            </p>
          </Card>
        )}

        {/* ── Members list ── */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Users size={18} className="text-gray-400" />
                All Members ({messData?.mess.members.length ?? 0})
              </span>
            </CardTitle>
          </CardHeader>

          <div className="space-y-2">
            {(messData?.mess.members ?? []).map((m) => {
              const rc            = ROLE_CONFIG[m.role];
              const isCurrentUser = m.userId === session?.user?.id;
              const isMonthManager = currentManager?.userId === m.userId;

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      m.role === "SUPER_ADMIN" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {m.user.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900">{m.user.name}</p>
                        {isCurrentUser && <span className="text-xs text-gray-400">(you)</span>}
                      </div>
                      <p className="text-xs text-gray-500">{m.user.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Joined {formatDate(m.joinedAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isMonthManager && (
                      <Badge variant="info">
                        <span className="flex items-center gap-1">
                          <Shield size={11} /> {MONTHS[month - 1]} Manager
                        </span>
                      </Badge>
                    )}
                    <Badge variant={rc.badgeVariant}>
                      <span className="flex items-center gap-1">
                        {m.role === "SUPER_ADMIN" ? <Crown size={11} /> : <User size={11} />}
                        {rc.label}
                      </span>
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

      </div>
    </div>
  );
}

function getErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "data" in err) {
    return (err as { data?: { error?: string } }).data?.error ?? "Something went wrong";
  }
  return "Something went wrong";
}
