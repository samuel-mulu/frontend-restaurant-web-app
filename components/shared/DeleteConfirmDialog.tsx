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
import { ReactNode, useEffect, useState } from "react";

interface DeleteConfirmDialogProps {
  title: string;
  description: string;
  itemName?: string;
  onConfirm: () => void | Promise<void>;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isLoading?: boolean;
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
  expectedPin,
}: DeleteConfirmDialogProps) {
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (open !== undefined && !open) {
      setPin("");
    }
  }, [open]);

  const internalOnOpenChange = (newOpen: boolean) => {
    if (!newOpen) setPin("");
    if (onOpenChange) onOpenChange(newOpen);
  };

  const handleConfirm = async () => {
    if (expectedPin && pin !== expectedPin) {
      return;
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
          {expectedPin && (
            <div className="mt-4 flex flex-col gap-2">
              <Label htmlFor="pin-input" className="text-sm font-medium">
                Enter Security PIN to Confirm
              </Label>
              <Input
                id="pin-input"
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="****"
                className="w-full max-w-[120px]"
              />
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              if (expectedPin && pin !== expectedPin) {
                e.preventDefault();
                // Optionally could show a toast here "Incorrect PIN"
                return;
              }
              handleConfirm();
            }}
            disabled={isLoading || (!!expectedPin && pin !== expectedPin)}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
