"use client";

import { useLanguage } from "@/hooks/useLanguage";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <Button
      variant="ghost"
      onClick={() => setLang(lang === "en" ? "am" : "en")}
      className="w-full justify-start py-2 px-4 rounded-sm font-lato font-normal leading-[22px] tracking-normal align-middle text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      <Languages className="h-5 w-5 mr-3 shrink-0" />
      <span className="text-sm font-lato leading-[22px] tracking-normal align-middle">
        {lang === "en" ? "አማርኛ" : "English"}
      </span>
    </Button>
  );
}
