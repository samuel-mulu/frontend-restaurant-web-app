"use client";

import { CalendarSystemProvider } from "@/hooks/useCalendarSystem";
import { LanguageProvider } from "@/hooks/useLanguage";
import { store } from "@/stores";
import { Provider } from "react-redux";
import { OfflineProvider } from "./offline/OfflineProvider";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <LanguageProvider>
          <CalendarSystemProvider>
            <OfflineProvider>{children}</OfflineProvider>
          </CalendarSystemProvider>
        </LanguageProvider>
      </ThemeProvider>
    </Provider>
  );
}
