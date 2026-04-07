"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingCart,
  Wallet,
  Users,
  BarChart3,
  LogOut,
  ChefHat,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { api } from "@/store/api";
import { MemberRole } from "@/types";

interface SidebarProps {
  messName: string;
  messCode: string;
  userRole: MemberRole;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/meals", label: "Meals", icon: UtensilsCrossed },
  { href: "/dashboard/bazaar", label: "Bazaar", icon: ShoppingCart },
  { href: "/dashboard/payments", label: "Payments", icon: Wallet },
  { href: "/dashboard/members", label: "Members", icon: Users },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
];

export default function Sidebar({
  messName,
  messCode,
  userRole,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();

  const handleSignOut = async () => {
    await signOut();
    dispatch(api.util.resetApiState());
    router.push("/login");
  };

  const roleLabel = userRole === "SUPER_ADMIN" ? "Super Admin" : "Member";
  const roleBadgeColor = userRole === "SUPER_ADMIN"
    ? "bg-purple-100 text-purple-700"
    : "bg-gray-100 text-gray-600";

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-30 h-full w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300",
          "lg:translate-x-0 lg:static lg:z-auto",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary-600 p-2">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate text-sm leading-tight">
                {messName}
              </p>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                Code: <span className="font-semibold text-primary-600">{messCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
              roleBadgeColor
            )}
          >
            {roleLabel}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon
                  size={18}
                  className={isActive ? "text-primary-600" : "text-gray-400"}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
