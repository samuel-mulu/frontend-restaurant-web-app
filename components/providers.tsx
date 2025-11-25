"use client";

import { Provider } from "react-redux";
import { store } from "@/stores";
import { OfflineProvider } from "./offline/OfflineProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <OfflineProvider>{children}</OfflineProvider>
    </Provider>
  );
}
