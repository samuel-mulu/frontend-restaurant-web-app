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
import { useLanguage } from "@/hooks/useLanguage";
import { formatDateLocal } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    amount: number;
    paymentDate?: Date;
    paymentMethod?: string;
    remarks?: string;
  }) => Promise<void>;
  maxAmount: number;
  isLoading?: boolean;
}

export function PaymentDialog({
  open,
  onOpenChange,
  onSubmit,
  maxAmount,
  isLoading = false,
}: PaymentDialogProps) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() =>
    formatDateLocal(new Date())
  );
  const [paymentMethod, setPaymentMethod] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const PAYMENT_METHODS = [
    { value: "cash", label: t("payment_method_cash") },
    { value: "bank_transfer", label: t("payment_method_bank_transfer") },
    { value: "check", label: t("payment_method_check") },
    { value: "mobile_money", label: t("payment_method_mobile_money") },
    { value: "other", label: t("payment_method_other") },
  ];

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (!amount.trim()) {
      newErrors.amount = t("payment_amount_required");
    } else {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        newErrors.amount = t("payment_amount_invalid");
      } else if (amountNum > maxAmount) {
        newErrors.amount = `${t("payment_amount_exceeds")} (${maxAmount.toFixed(2)} Br)`;
      }
    }

    if (!paymentDate) {
      newErrors.paymentDate = t("payment_date_required");
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      await onSubmit({
        amount: parseFloat(amount),
        paymentDate: new Date(paymentDate),
        paymentMethod: paymentMethod || undefined,
        remarks: remarks.trim() || undefined,
      });

      // Reset form
      setAmount("");
      setPaymentDate(formatDateLocal(new Date()));
      setPaymentMethod("");
      setRemarks("");
      setErrors({});
    }
  };

  const handleClose = () => {
    setAmount("");
    setPaymentDate(formatDateLocal(new Date()));
    setPaymentMethod("");
    setRemarks("");
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card text-foreground border-border">
        <DialogHeader>
          <DialogTitle>{t("payment_dialog_title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="payment-amount">
              {t("payment_amount_label")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="payment-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                  setAmount(value);
                }
              }}
              placeholder={t("payment_amount_placeholder")}
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
              {t("payment_remaining")}: {maxAmount.toFixed(2)} Br
            </p>
          </div>

          <div>
            <Label htmlFor="payment-date">
              {t("payment_date_label")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className={cn(
                "mt-2 min-h-[44px]",
                errors.paymentDate && "border-red-500"
              )}
              disabled={isLoading}
            />
            {errors.paymentDate && (
              <p className="text-sm text-red-500 mt-1">{errors.paymentDate}</p>
            )}
          </div>

          <div>
            <Label htmlFor="payment-method">
              {t("payment_method_label")}{" "}
              <span className="text-gray-500 text-xs">{t("payment_method_optional")}</span>
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              disabled={isLoading}
            >
              <SelectTrigger className="mt-2 min-h-[44px]" id="payment-method">
                <SelectValue placeholder={t("payment_method_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="payment-remarks">
              {t("payment_remarks_label")}{" "}
              <span className="text-gray-500 text-xs">{t("payment_remarks_optional")}</span>
            </Label>
            <Input
              id="payment-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={t("payment_remarks_placeholder")}
              className="mt-2 min-h-[44px]"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t("payment_cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("payment_submitting")}
              </>
            ) : (
              t("payment_submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
