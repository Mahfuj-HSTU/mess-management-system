"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import {
  useGetMyMessQuery,
  useCreateMessMutation,
  useJoinMessMutation,
} from "@/store/api";
import Sidebar from "@/components/dashboard/sidebar";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { ChefHat, Plus, Hash } from "lucide-react";
import toast from "react-hot-toast";

// ─── Loading Spinner ──────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

// ─── Onboarding (no mess yet) ─────────────────────────────────────────────────

function OnboardingScreen() {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin,   setShowJoin]   = useState(false);
  const [messName,   setMessName]   = useState("");
  const [joinCode,   setJoinCode]   = useState("");

  const [createMess, { isLoading: creating }] = useCreateMessMutation();
  const [joinMess,   { isLoading: joining  }] = useJoinMessMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messName.trim()) return;
    try {
      const result = await createMess({ name: messName.trim() }).unwrap();
      toast.success(`"${result.mess.name}" created! Code: ${result.mess.code}`);
      setShowCreate(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      await joinMess({ code: joinCode.trim() }).unwrap();
      toast.success("Joined the mess successfully!");
      setShowJoin(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

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
          Create a new mess or join an existing one with an invite code.
        </p>

        <div className="flex flex-col gap-3">
          <Button size="lg" className="w-full" onClick={() => setShowCreate(true)}>
            <Plus size={18} /> Create a New Mess
          </Button>
          <Button size="lg" variant="outline" className="w-full" onClick={() => setShowJoin(true)}>
            <Hash size={18} /> Join with Invite Code
          </Button>
        </div>
      </div>

      {/* Create mess modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Mess">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Mess Name"
            placeholder="e.g. Sunrise Mess"
            value={messName}
            onChange={(e) => setMessName(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating} className="flex-1">
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join mess modal */}
      <Modal isOpen={showJoin} onClose={() => setShowJoin(false)} title="Join a Mess">
        <form onSubmit={handleJoin} className="space-y-4">
          <Input
            label="Invite Code"
            placeholder="e.g. ABCD1234"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="font-mono tracking-widest uppercase"
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowJoin(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={joining} className="flex-1">
              Join
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Main Dashboard Layout ────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Skip the query until we know the user is logged in
  const { data: messData, isLoading: messLoading } = useGetMyMessQuery(undefined, {
    skip: isPending || !session,
  });

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [session, isPending, router]);

  if (isPending || messLoading) return <LoadingScreen />;
  if (!session) return null; // redirect in progress

  // User logged in but has no mess yet → show onboarding
  if (!messData) return <OnboardingScreen />;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        messName={messData.mess.name}
        messCode={messData.mess.code}
        userRole={messData.role}
        isMobileOpen={isSidebarOpen}
        onMobileClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "data" in err) {
    const e = err as { data?: { error?: string } };
    return e.data?.error ?? "Something went wrong";
  }
  return "Something went wrong";
}
