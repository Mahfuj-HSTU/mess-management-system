const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data as T;
}

// ─── Mess ─────────────────────────────────────────────────────────────────────
export const messApi = {
  create: (name: string) =>
    request("/api/mess/create", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  join: (code: string) =>
    request("/api/mess/join", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  getMy: () => request("/api/mess/my"),

  assignManager: (messId: string, userId: string) =>
    request(`/api/mess/${messId}/assign-manager`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  leave: (messId: string) =>
    request(`/api/mess/${messId}/leave`, { method: "DELETE" }),
};

// ─── Meals ────────────────────────────────────────────────────────────────────
export const mealApi = {
  add: (
    messId: string,
    data: {
      userId: string;
      date: string;
      breakfast: boolean;
      lunch: boolean;
      dinner: boolean;
    }
  ) =>
    request(`/api/meals/${messId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAll: (messId: string, month: number, year: number) =>
    request(`/api/meals/${messId}?month=${month}&year=${year}`),

  getMember: (messId: string, userId: string, month: number, year: number) =>
    request(`/api/meals/${messId}/member/${userId}?month=${month}&year=${year}`),

  delete: (messId: string, mealId: string) =>
    request(`/api/meals/${messId}/${mealId}`, { method: "DELETE" }),
};

// ─── Bazaar ───────────────────────────────────────────────────────────────────
export const bazaarApi = {
  add: (
    messId: string,
    data: { amount: number; description?: string; date: string }
  ) =>
    request(`/api/bazaar/${messId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAll: (messId: string, month: number, year: number) =>
    request(`/api/bazaar/${messId}?month=${month}&year=${year}`),

  delete: (messId: string, bazaarId: string) =>
    request(`/api/bazaar/${messId}/${bazaarId}`, { method: "DELETE" }),
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const paymentApi = {
  add: (
    messId: string,
    data: { memberId: string; amount: number; note?: string; date: string }
  ) =>
    request(`/api/payments/${messId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAll: (messId: string, month: number, year: number) =>
    request(`/api/payments/${messId}?month=${month}&year=${year}`),

  getMember: (messId: string, userId: string, month: number, year: number) =>
    request(
      `/api/payments/${messId}/member/${userId}?month=${month}&year=${year}`
    ),

  getCash: (messId: string) => request(`/api/payments/${messId}/cash`),

  delete: (messId: string, paymentId: string) =>
    request(`/api/payments/${messId}/${paymentId}`, { method: "DELETE" }),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportApi = {
  getMonthly: (messId: string, month: number, year: number) =>
    request(`/api/reports/${messId}/monthly?month=${month}&year=${year}`),

  getHistory: (messId: string) =>
    request(`/api/reports/${messId}/history`),

  sendReminders: (messId: string, month: number, year: number) =>
    request(`/api/reports/${messId}/send-reminders`, {
      method: "POST",
      body: JSON.stringify({ month, year }),
    }),
};
