"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    amount: number;
    reason: string;
    description?: string;
  }) => Promise<void>;
  maxAmount: number;
  isLoading?: boolean;
}

const WITHDRAWAL_REASONS = [
  { value: "cash", label: "Cash Advance" },
  { value: "broke_products", label: "Broke Products" },
  { value: "advance", label: "Advance Payment" },
  { value: "deduction", label: "Deduction" },
  { value: "loan", label: "Loan" },
  { value: "other", label: "Other" },
];

export function WithdrawalDialog({
  open,
  onOpenChange,
  onSubmit,
  maxAmount,
  isLoading = false,
}: WithdrawalDialogProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (!amount.trim()) {
      newErrors.amount = "Amount is required";
    } else {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        newErrors.amount = "Amount must be greater than 0";
      } else if (amountNum > maxAmount) {
        newErrors.amount = `Amount cannot exceed available balance (${maxAmount.toFixed(
          2
        )} Br)`;
      }
    }

    if (!reason) {
      newErrors.reason = "Reason is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      await onSubmit({
        amount: parseFloat(amount),
        reason,
        description: description.trim() || undefined,
      });

      // Reset form
      setAmount("");
      setReason("");
      setDescription("");
      setErrors({});
    }
  };

  const handleClose = () => {
    setAmount("");
    setReason("");
    setDescription("");
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card text-foreground border-border">
        <DialogHeader>
          <DialogTitle>Create Withdrawal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="withdrawal-amount">
              Amount (Br) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="withdrawal-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                  setAmount(value);
                }
              }}
              placeholder="0.00"
              className={cn(
                "mt-2 min-h-[44px]",
                errors.amount && "border-red-500"
              )}
              disabled={isLoading}
            />
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Available: {maxAmount.toFixed(2)} Br
            </p>
          </div>

          <div>
            <Label htmlFor="withdrawal-reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Select
              value={reason}
              onValueChange={setReason}
              disabled={isLoading}
            >
              <SelectTrigger
                className="mt-2 min-h-[44px]"
                id="withdrawal-reason"
              >
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {WITHDRAWAL_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && (
              <p className="text-sm text-red-500 mt-1">{errors.reason}</p>
            )}
          </div>

          <div>
            <Label htmlFor="withdrawal-description">
              Description{" "}
              <span className="text-gray-500 text-xs">(Optional)</span>
            </Label>
            <Input
              id="withdrawal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              className="mt-2 min-h-[44px]"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Withdrawal"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
