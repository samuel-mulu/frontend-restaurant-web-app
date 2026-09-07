import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { apiSlice } from "@/stores/baseApi";
import authReducer from "@/stores/features/auth/authSlice";
// Import API endpoints to ensure they are injected
import "@/stores/features/staff/staffApi";
import "@/stores/features/tables/tablesApi";
import "@/stores/features/categories/categoriesApi";
import "@/stores/features/items/itemsApi";
import "@/stores/features/inventory/inventoryApi";
import "@/stores/features/inventory/inventoryAssignmentsApi";
import "@/stores/features/settings/settingsApi";

export const store = configureStore({
  reducer: {
    // Add the generated reducer as a specific top-level slice
    [apiSlice.reducerPath]: apiSlice.reducer,
    // Add auth reducer
    auth: authReducer,
  },
  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of `rtk-query`
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
  // Enable Redux DevTools in development
  devTools: process.env.NODE_ENV !== "production",
});

// Optional: Set up listeners for refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
