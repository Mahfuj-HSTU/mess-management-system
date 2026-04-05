"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { messApi } from "@/lib/api";
import Sidebar from "@/components/dashboard/sidebar";
import { Mess, MemberRole } from "@/types";
import { ChefHat, Plus, Hash } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import toast from "react-hot-toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [mess, setMess] = useState<Mess | null>(null);
  const [role, setRole] = useState<MemberRole>("MEMBER");
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Create mess modal
  const [showCreate, setShowCreate] = useState(false);
  const [messName, setMessName] = useState("");
  const [creating, setCreating] = useState(false);

  // Join mess modal
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.push("/login");
      return;
    }
    fetchMess();
  }, [session, isPending]);

  const fetchMess = async () => {
    try {
      const data = await messApi.getMy() as { mess: Mess; role: MemberRole };
      setMess(data.mess);
      setRole(data.role);
    } catch {
      // User has no mess yet — will show onboarding
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messName.trim()) return;
    setCreating(true);
    try {
      const data = await messApi.create(messName.trim()) as { mess: Mess };
      setMess(data.mess);
      setRole("SUPER_ADMIN");
      setShowCreate(false);
      toast.success(`"${data.mess.name}" created! Code: ${data.mess.code}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create mess");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinMess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      await messApi.join(joinCode.trim());
      await fetchMess();
      setShowJoin(false);
      toast.success("Joined the mess successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to join mess");
    } finally {
      setJoining(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!mess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 mb-6 shadow-lg">
            <ChefHat className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Mess Management
          </h1>
          <p className="text-gray-500 mb-8">
            Create a new mess or join an existing one using an invite code.
          </p>

          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              onClick={() => setShowCreate(true)}
              className="w-full"
            >
              <Plus size={18} />
              Create a New Mess
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowJoin(true)}
              className="w-full"
            >
              <Hash size={18} />
              Join with Invite Code
            </Button>
          </div>
        </div>

        {/* Create Mess Modal */}
        <Modal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title="Create New Mess"
        >
          <form onSubmit={handleCreateMess} className="space-y-4">
            <Input
              label="Mess Name"
              placeholder="e.g. Sunrise Mess"
              value={messName}
              onChange={(e) => setMessName(e.target.value)}
            />
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={creating} className="flex-1">
                Create Mess
              </Button>
            </div>
          </form>
        </Modal>

        {/* Join Mess Modal */}
        <Modal
          isOpen={showJoin}
          onClose={() => setShowJoin(false)}
          title="Join a Mess"
        >
          <form onSubmit={handleJoinMess} className="space-y-4">
            <Input
              label="Invite Code"
              placeholder="e.g. ABCD1234"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="font-mono tracking-widest uppercase"
            />
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setShowJoin(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={joining} className="flex-1">
                Join Mess
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        messName={mess.name}
        messCode={mess.code}
        userRole={role}
        isMobileOpen={isSidebarOpen}
        onMobileClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        <div className="flex-1 overflow-y-auto">
          {/* Inject mess & role via context — here we use a simpler approach */}
          {children}
        </div>
      </div>
    </div>
  );
}
