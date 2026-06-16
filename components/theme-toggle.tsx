"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/hooks/useLanguage"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const { t } = useLanguage()

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="w-9 px-0">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="w-full justify-start py-2 px-4 rounded-sm font-lato font-normal leading-[22px] tracking-normal align-middle text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      {theme === "light" ? (
        <>
          <Moon className="h-5 w-5 mr-3" />
          <span className="text-sm font-lato leading-[22px] tracking-normal align-middle">
            {t("sidebar_dark_mode")}
          </span>
        </>
      ) : (
        <>
          <Sun className="h-5 w-5 mr-3" />
          <span className="text-sm font-lato leading-[22px] tracking-normal align-middle">
            {t("sidebar_light_mode")}
          </span>
        </>
      )}
    </Button>
  )
}
