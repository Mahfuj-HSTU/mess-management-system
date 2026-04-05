/**
 * Redux Store
 *
 * We only need the RTK Query reducer and middleware here.
 * No manual slices needed — RTK Query manages all server state.
 */

import { configureStore } from "@reduxjs/toolkit";
import { api } from "./api";

export const store = configureStore({
  reducer: {
    // RTK Query stores all cached API data under this key
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    // RTK Query middleware handles cache lifetime, invalidation, polling, etc.
    getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
