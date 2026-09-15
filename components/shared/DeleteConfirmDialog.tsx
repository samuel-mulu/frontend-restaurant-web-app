"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVerifySecurityPinMutation } from "@/stores/features/settings/settingsApi";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

interface DeleteConfirmDialogProps {
  title: string;
  description: string;
  itemName?: string;
  onConfirm: () => void | Promise<void>;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isLoading?: boolean;
  /** When true, requires void security PIN verified against the server */
  requireSecurityPin?: boolean;
  /** @deprecated Use requireSecurityPin instead */
  expectedPin?: string;
}

export function DeleteConfirmDialog({
  title,
  description,
  itemName,
  onConfirm,
  trigger,
  open,
  onOpenChange,
  isLoading = false,
  requireSecurityPin,
  expectedPin,
}: DeleteConfirmDialogProps) {
  const needsPin = requireSecurityPin ?? Boolean(expectedPin);
  const [pin, setPin] = useState("");
  const [verifyPin, { isLoading: isVerifying }] = useVerifySecurityPinMutation();

  useEffect(() => {
    if (open !== undefined && !open) {
      setPin("");
    }
  }, [open]);

  const internalOnOpenChange = (newOpen: boolean) => {
    if (!newOpen) setPin("");
    if (onOpenChange) onOpenChange(newOpen);
  };

  const handleConfirm = async (e?: React.MouseEvent) => {
    if (needsPin) {
      e?.preventDefault();
      if (pin.length !== 4) {
        toast.error("Enter a 4-digit security PIN");
        return;
      }
      try {
        await verifyPin({ type: "void", pin }).unwrap();
      } catch {
        toast.error("Invalid security PIN");
        return;
      }
    }
    await onConfirm();
    internalOnOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={internalOnOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
            {itemName && (
              <>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{itemName}</span>.
              </>
            )}
          </AlertDialogDescription>
          {needsPin && (
            <div className="mt-4 flex flex-col gap-2">
              <Label htmlFor="pin-input" className="text-sm font-medium">
                Enter Security PIN to Confirm
              </Label>
              <Input
                id="pin-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="****"
                className="w-full max-w-[120px]"
              />
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading || isVerifying}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              handleConfirm(e);
            }}
            disabled={
              isLoading ||
              isVerifying ||
              (needsPin && pin.length !== 4)
            }
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading || isVerifying ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
