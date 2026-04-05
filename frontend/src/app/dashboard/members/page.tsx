"use client";

import { useGetMyMessQuery, useAssignManagerMutation } from "@/store/api";
import { useSession } from "@/lib/auth-client";
import Header from "@/components/dashboard/header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { Users, Crown, Shield, User } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { MemberRole } from "@/types";
import toast from "react-hot-toast";

// Role display config
const ROLE_CONFIG: Record<MemberRole, { label: string; badgeVariant: "purple" | "info" | "default"; icon: React.ReactNode }> = {
  SUPER_ADMIN: { label: "Super Admin", badgeVariant: "purple", icon: <Crown size={12} /> },
  MANAGER:     { label: "Manager",     badgeVariant: "info",   icon: <Shield size={12} /> },
  MEMBER:      { label: "Member",      badgeVariant: "default", icon: <User size={12} /> },
};

export default function MembersPage() {
  const { data: session }                              = useSession();
  const { data: messData, isLoading }                  = useGetMyMessQuery();
  const [assignManager, { isLoading: assigning }]     = useAssignManagerMutation();

  const role         = messData?.role ?? "MEMBER";
  const isSuperAdmin = role === "SUPER_ADMIN";

  const handleAssignManager = async (userId: string, name: string) => {
    if (!messData) return;
    if (!confirm(`Assign "${name}" as manager? The current manager will be demoted.`)) return;
    try {
      const result = await assignManager({ messId: messData.mess.id, userId }).unwrap();
      toast.success(result.message);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

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

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Users size={18} className="text-gray-400" />
                Members ({messData?.mess.members.length ?? 0})
              </span>
            </CardTitle>
          </CardHeader>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {messData?.mess.members.map((m) => {
                const rc           = ROLE_CONFIG[m.role];
                const isCurrentUser = m.userId === session?.user?.id;
                // Super admin can assign any non-admin, non-manager member as manager
                const canPromote   = isSuperAdmin && m.role === "MEMBER" && !isCurrentUser;

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                  >
                    {/* Avatar + info */}
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        m.role === "SUPER_ADMIN" ? "bg-purple-100 text-purple-700" :
                        m.role === "MANAGER"     ? "bg-blue-100 text-blue-700"     :
                                                   "bg-gray-100 text-gray-600"
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

                    {/* Badge + action */}
                    <div className="flex items-center gap-2">
                      <Badge variant={rc.badgeVariant}>
                        <span className="flex items-center gap-1">{rc.icon} {rc.label}</span>
                      </Badge>
                      {canPromote && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={assigning}
                          onClick={() => handleAssignManager(m.userId, m.user.name)}
                        >
                          <Shield size={13} /> Make Manager
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Tip for super admin */}
        {isSuperAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">Super Admin Note</p>
            <p className="text-sm text-amber-700">
              You can assign any member as manager. The current manager will automatically be
              demoted. Only one manager is allowed at a time.
            </p>
          </div>
        )}

      </div>
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
