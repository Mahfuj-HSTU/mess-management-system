"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useJoinMessMutation } from "@/store/api";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { ChefHat, Hash } from "lucide-react";
import toast from "react-hot-toast";

export default function JoinPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const [joinMess, { isLoading }] = useJoinMessMutation();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Mess code is required");
      return;
    }

    if (!session) {
      toast.error("Please sign in first to join a mess.");
      router.push("/login");
      return;
    }

    try {
      await joinMess({ code: code.trim() }).unwrap();
      toast.success("Successfully joined the mess!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "data" in err
          ? (err as { data?: { error?: string } }).data?.error
          : undefined;
      toast.error(msg ?? "Failed to join mess");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 mb-4 shadow-lg">
            <ChefHat className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join a Mess</h1>
          <p className="text-gray-500 mt-1.5 text-sm">
            Enter your mess invite code to join
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleJoin} className="space-y-5">
            <div className="relative">
              <Hash className="absolute left-3 top-[38px] h-4 w-4 text-gray-400" />
              <Input
                label="Mess Code"
                type="text"
                placeholder="e.g. MESS1234"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError("");
                }}
                error={error}
                className="pl-10 font-mono tracking-widest text-base uppercase"
                maxLength={12}
              />
            </div>

            <Button
              type="submit"
              loading={isLoading}
              className="w-full"
              size="lg"
            >
              Join Mess
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center space-y-2">
            <p className="text-sm text-gray-500">
              Want to create your own mess?{" "}
              <Link
                href="/dashboard"
                className="font-semibold text-primary-600 hover:text-primary-700"
              >
                Create Mess
              </Link>
            </p>
            <p className="text-sm text-gray-500">
              <Link
                href="/login"
                className="font-semibold text-primary-600 hover:text-primary-700"
              >
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
