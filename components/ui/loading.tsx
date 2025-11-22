import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  /**
   * Optional text to display below the spinner
   */
  text?: string;
  /**
   * Optional size variant
   */
  size?: "sm" | "md" | "lg";
  /**
   * Optional full screen mode
   */
  fullScreen?: boolean;
  /**
   * Optional className for custom styling
   */
  className?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function Loading({
  text,
  size = "md",
  fullScreen = false,
  className,
}: LoadingProps) {
  const spinnerSize = sizeMap[size];

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className
      )}
    >
      <Loader2 className={cn("animate-spin text-slate-600", spinnerSize)} />
      {text && (
        <p className="text-sm font-medium text-slate-600 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center justify-center p-4">{content}</div>
      </div>
    );
  }

  return content;
}
