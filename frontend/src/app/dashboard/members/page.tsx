"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { messApi } from "@/lib/api";
import Header from "@/components/dashboard/header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { Users, Crown, Shield, User } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Mess, MemberRole } from "@/types";
import toast from "react-hot-toast";

export default function MembersPage() {
  const { data: session } = useSession();
  const [mess, setMess] = useState<Mess | null>(null);
  const [role, setRole] = useState<MemberRole>("MEMBER");
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await messApi.getMy() as { mess: Mess; role: MemberRole };
      setMess(data.mess);
      setRole(data.role);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleAssignManager = async (userId: string, name: string) => {
    if (!mess) return;
    if (!confirm(`Assign "${name}" as manager? The current manager will be demoted.`))
      return;

    setAssigningId(userId);
    try {
      await messApi.assignManager(mess.id, userId);
      await fetchData();
      toast.success(`${name} is now the manager!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to assign manager");
    } finally {
      setAssigningId(null);
    }
  };

  const isSuperAdmin = role === "SUPER_ADMIN";

  const roleConfig: Record<
    MemberRole,
    { label: string; variant: "purple" | "info" | "default"; icon: React.ReactNode }
  > = {
    SUPER_ADMIN: {
      label: "Super Admin",
      variant: "purple",
      icon: <Crown size={12} />,
    },
    MANAGER: {
      label: "Manager",
      variant: "info",
      icon: <Shield size={12} />,
    },
    MEMBER: {
      label: "Member",
      variant: "default",
      icon: <User size={12} />,
    },
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Members" />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        {/* Mess invite code */}
        {mess && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">
                Invite Code
              </p>
              <p className="text-2xl font-bold font-mono text-blue-700 tracking-widest">
                {mess.code}
              </p>
            </div>
            <p className="text-sm text-blue-600">
              Share this code to invite new members
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Users size={18} className="text-gray-400" />
                Members ({mess?.members.length || 0})
              </span>
            </CardTitle>
          </CardHeader>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {mess?.members.map((m) => {
                const rc = roleConfig[m.role];
                const isCurrentUser = m.userId === session?.user?.id;
                const canAssignAsManager =
                  isSuperAdmin &&
                  m.role !== "SUPER_ADMIN" &&
                  m.role !== "MANAGER" &&
                  !isCurrentUser;

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          m.role === "SUPER_ADMIN"
                            ? "bg-purple-100 text-purple-700"
                            : m.role === "MANAGER"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {m.user.name[0].toUpperCase()}
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">
                            {m.user.name}
                          </p>
                          {isCurrentUser && (
                            <span className="text-xs text-gray-400">(you)</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{m.user.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Joined {formatDate(m.joinedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={rc.variant}>
                        <span className="flex items-center gap-1">
                          {rc.icon}
                          {rc.label}
                        </span>
                      </Badge>

                      {canAssignAsManager && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={assigningId === m.userId}
                          onClick={() =>
                            handleAssignManager(m.userId, m.user.name)
                          }
                        >
                          <Shield size={13} />
                          Make Manager
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {isSuperAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">
              Super Admin Note
            </p>
            <p className="text-sm text-amber-700">
              As the super admin, you can assign any member as the manager. The
              current manager will automatically be demoted to a regular member.
              Only one manager is allowed at a time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
