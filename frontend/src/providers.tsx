"use client";

/**
 * Providers
 *
 * Wraps the app with Redux store. Must be a Client Component
 * because Redux Provider uses React context under the hood.
 */

import { Provider } from "react-redux";
import { store } from "@/store";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
