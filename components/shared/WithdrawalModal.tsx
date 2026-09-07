"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useCalendarSystem, formatDateWithSystem } from "@/hooks/useCalendarSystem";
import { useCreateExpenseMutation } from "@/stores/features/statistics/statisticsApi";
import { useVerifySecurityPinMutation } from "@/stores/features/settings/settingsApi";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface WithdrawalModalProps {
  onSuccess?: () => void;
  selectedDate?: Date;
  trigger?: React.ReactNode;
}

export function WithdrawalModal({ onSuccess, selectedDate = new Date(), trigger }: WithdrawalModalProps) {
  const { t } = useLanguage();
  const { calSystem } = useCalendarSystem();
  const [isOpen, setIsOpen] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pin, setPin] = useState("");
  const [verifiedPin, setVerifiedPin] = useState("");
  const [newExpense, setNewExpense] = useState({
    amount: "",
    reason: "",
    expenseType: "cash" as "cash" | "mobile_banking",
    description: "",
  });

  const [createExpense, { isLoading: isCreatingExpense }] = useCreateExpenseMutation();
  const [verifyPin, { isLoading: isVerifyingPin }] = useVerifySecurityPinMutation();

  const formatDateForReport = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleVerifyPin = async () => {
    if (!/^\d{4}$/.test(pin)) {
      toast.error("Enter a 4-digit PIN code");
      return;
    }
    try {
      await verifyPin({ type: "expense", pin }).unwrap();
      setVerifiedPin(pin);
      setIsPinVerified(true);
      setPin("");
    } catch {
      toast.error("Invalid PIN code");
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.reason) {
      toast.error("Please fill in amount and reason");
      return;
    }

    if (!verifiedPin) {
      toast.error("Security PIN is required");
      setIsPinVerified(false);
      return;
    }

    try {
      await createExpense({
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        expenseType: newExpense.expenseType,
        date: formatDateForReport(selectedDate),
        pin: verifiedPin,
      }).unwrap();

      toast.success("Expense recorded successfully");
      setIsOpen(false);
      setIsPinVerified(false);
      setVerifiedPin("");
      setNewExpense({
        amount: "",
        reason: "",
        expenseType: "cash",
        description: "",
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMessage = err?.data?.message || "Failed to record expense";
      toast.error(errorMessage);
      if (
        typeof errorMessage === "string" &&
        errorMessage.toLowerCase().includes("pin")
      ) {
        setIsPinVerified(false);
        setVerifiedPin("");
      }
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setIsPinVerified(false);
      setPin("");
      setVerifiedPin("");
      setNewExpense({
        amount: "",
        reason: "",
        expenseType: "cash",
        description: "",
      });
    }
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button onClick={() => setIsOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("cashout_record")}
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          {!isPinVerified ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("cashout_verify_pin_title")}</DialogTitle>
                <DialogDescription>
                  {t("cashout_verify_pin_desc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="pin" className="text-sm font-semibold">
                    {t("cashout_pin_label")}
                  </Label>
                  <Input
                    id="pin"
                    type="password"
                    placeholder={t("cashout_pin_placeholder")}
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) =>
                      setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyPin()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  {t("cashout_cancel")}
                </Button>
                <Button
                  onClick={handleVerifyPin}
                  disabled={pin.length !== 4 || isVerifyingPin}
                >
                  {isVerifyingPin ? t("cashout_saving") : t("cashout_verify_btn")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("cashout_title")}</DialogTitle>
                <DialogDescription>
                  {formatDateWithSystem(calSystem, selectedDate)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-semibold">
                    {t("cashout_amount_label")}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm font-semibold">
                    {t("cashout_reason_label")}
                  </Label>
                  <Select
                    value={newExpense.reason}
                    onValueChange={(v) => setNewExpense({ ...newExpense, reason: v })}
                  >
                    <SelectTrigger id="reason">
                      <SelectValue placeholder={t("cashout_reason_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General Withdrawal">
                        {t("cashout_reason_withdrawal")}
                      </SelectItem>
                      <SelectItem value="Inventory Purchase">
                        {t("cashout_reason_inventory")}
                      </SelectItem>
                      <SelectItem value="Salary Advance">
                        {t("cashout_reason_salary")}
                      </SelectItem>
                      <SelectItem value="Broke Products">
                        {t("cashout_reason_broke")}
                      </SelectItem>
                      <SelectItem value="Utilities / Repairs">
                        {t("cashout_reason_utility")}
                      </SelectItem>
                      <SelectItem value="Other">{t("cashout_reason_other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expenseType" className="text-sm font-semibold">
                    {t("cashout_expense_type_label")}
                  </Label>
                  <Select
                    value={newExpense.expenseType}
                    onValueChange={(v) =>
                      setNewExpense({ ...newExpense, expenseType: v as "cash" | "mobile_banking" })
                    }
                  >
                    <SelectTrigger id="expenseType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">
                    {t("cashout_description_label")}
                  </Label>
                  <Input
                    id="description"
                    value={newExpense.description}
                    placeholder={t("cashout_description_placeholder")}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  {t("cashout_cancel")}
                </Button>
                <Button
                  onClick={handleAddExpense}
                  disabled={isCreatingExpense}
                >
                  {isCreatingExpense ? t("cashout_saving") : t("cashout_save")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
