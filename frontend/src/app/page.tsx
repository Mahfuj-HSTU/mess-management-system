import Link from "next/link";
import {
  ChefHat,
  UtensilsCrossed,
  ShoppingCart,
  Wallet,
  BarChart3,
  Users,
  Mail,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: UtensilsCrossed,
    title: "Meal Tracking",
    description:
      "Track breakfast, lunch, and dinner for each member daily. Get automated meal counts.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    icon: ShoppingCart,
    title: "Bazaar Management",
    description:
      "Log all grocery purchases with descriptions and dates. Monitor monthly spending.",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: Wallet,
    title: "Payment Records",
    description:
      "Track member payments and dues easily. Manager cash balance stays private.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: BarChart3,
    title: "Monthly Reports",
    description:
      "Auto-calculated meal rates, individual costs, dues, and advances in one view.",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: Mail,
    title: "Due Reminders",
    description:
      "Send automated email reminders to members with pending dues in one click.",
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    icon: Users,
    title: "Role Management",
    description:
      "Super admin, manager, and member roles with appropriate access controls.",
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
];

const roles = [
  {
    role: "Super Admin",
    color: "bg-purple-600",
    permissions: [
      "Create the mess",
      "Generate invite code",
      "Assign manager role",
    ],
  },
  {
    role: "Manager",
    color: "bg-blue-600",
    permissions: [
      "Add/remove meals",
      "Log bazaar expenses",
      "Record member payments",
      "Generate monthly reports",
      "Send due reminders",
    ],
  },
  {
    role: "Member",
    color: "bg-gray-600",
    permissions: [
      "View all meals & bazaar",
      "View payment history",
      "View monthly reports",
      "View own balance",
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary-600 p-2">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">MessManager</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-blue-50 pt-20 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
            <span>Simple. Transparent. Efficient.</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Manage Your Mess
            <span className="text-primary-600 block">Without the Mess</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
            Track meals, groceries, and payments for your mess. Generate monthly
            reports, send due reminders, and keep everyone informed — all in
            one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 text-base"
            >
              Create a Mess
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/join"
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-800 font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-50 border border-gray-200 transition-colors text-base"
            >
              Join with Code
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Everything You Need
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              A complete solution for managing your mess finances and meal
              records.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description, color, bg }) => (
              <div
                key={title}
                className="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all"
              >
                <div className={`inline-flex p-3 rounded-xl ${bg} mb-4`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  {title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Roles & Permissions
            </h2>
            <p className="text-gray-500">
              Clear responsibilities for everyone in the mess.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map(({ role, color, permissions }) => (
              <div
                key={role}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className={`${color} px-5 py-4`}>
                  <h3 className="text-white font-bold text-lg">{role}</h3>
                </div>
                <ul className="p-5 space-y-2.5">
                  {permissions.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2
                        size={16}
                        className="text-green-500 mt-0.5 flex-shrink-0"
                      />
                      <span className="text-gray-700">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-14">
            Get Started in 3 Steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create an Account",
                desc: "Sign up and create your mess with a name. Get a unique invite code.",
              },
              {
                step: "02",
                title: "Invite Members",
                desc: "Share the invite code. Members join instantly using the code.",
              },
              {
                step: "03",
                title: "Assign & Manage",
                desc: "Assign a manager. They handle meals, bazaar, payments & reports.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-primary-600 text-white font-bold text-xl flex items-center justify-center mb-4 shadow-lg shadow-primary-200">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-600 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-primary-200 mb-8">
            Join thousands of mess members who manage their expenses
            transparently.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-8 py-3.5 rounded-xl hover:bg-primary-50 transition-colors"
          >
            Create Your Mess Free
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} MessManager. Built for mess communities.
        </p>
      </footer>
    </div>
  );
}
