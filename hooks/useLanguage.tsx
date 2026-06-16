"use client";

import { translations, type Language, type TranslationKey } from "@/lib/i18n";
import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "app_language";

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored === "am" || stored === "en") {
      setLangState(stored);
    }
    setMounted(true);
  }, []);

  const setLang = (next: Language) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const t = (key: TranslationKey): string => {
    if (!mounted) return translations.en[key];
    return translations[lang][key];
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
