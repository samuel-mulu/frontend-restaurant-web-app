"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DollarSign, Smartphone, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethod = "cash" | "mobile_banking";

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
  className?: string;
}

export function PaymentMethodSelector({
  value,
  onChange,
  disabled = false,
  className,
}: PaymentMethodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (method: PaymentMethod) => {
    onChange(method);
    setIsOpen(false);
  };

  const getIcon = (method: PaymentMethod) => {
    // Show arrow icon for cash (default), mobile banking icon when selected
    return method === "cash" ? (
      <ChevronDown className="h-3 w-3" />
    ) : (
      <Smartphone className="h-3 w-3" />
    );
  };

  const getLabel = (method: PaymentMethod) => {
    return method === "cash" ? "Cash" : "Mobile Banking";
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        disabled={disabled}
        className={cn(
          "flex items-center justify-center rounded border border-gray-300 bg-white p-1 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors",
          value === "cash"
            ? "text-gray-600 dark:text-gray-400"
            : "text-blue-600 dark:text-blue-400"
        )}
        title={`Payment method: ${getLabel(value)}`}
      >
        {getIcon(value)}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-7 z-50 min-w-[140px] rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="p-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleSelect("cash");
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                value === "cash" &&
                  "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              )}
            >
              <DollarSign className="h-3 w-3" />
              <span>Cash</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleSelect("mobile_banking");
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                value === "mobile_banking" &&
                  "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
              )}
            >
              <Smartphone className="h-3 w-3" />
              <span>Mobile Banking</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
