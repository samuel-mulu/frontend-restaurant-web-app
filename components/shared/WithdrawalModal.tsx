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
  const [newExpense, setNewExpense] = useState({
    amount: "",
    reason: "",
    expenseType: "cash" as "cash" | "mobile_banking",
    description: "",
  });

  const [createExpense, { isLoading: isCreatingExpense }] = useCreateExpenseMutation();

  const formatDateForReport = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleVerifyPin = () => {
    if (pin === "1219") {
      setIsPinVerified(true);
      setPin("");
    } else {
      toast.error("Invalid PIN code");
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.reason) {
      toast.error("Please fill in amount and reason");
      return;
    }

    try {
      await createExpense({
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        expenseType: newExpense.expenseType,
        date: formatDateForReport(selectedDate),
      }).unwrap();

      toast.success("Expense recorded successfully");
      setIsOpen(false);
      setIsPinVerified(false);
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
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setIsPinVerified(false);
      setPin("");
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
      <div onClick={() => setIsOpen(true)}>
        {trigger || (
          <Button className="gap-2 shadow-sm bg-rose-600 hover:bg-rose-700 text-white border-none">
            <Plus className="h-4 w-4" />
            {t("cashout_record")}
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50">
          {!isPinVerified ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("cashout_verify_pin_title")}</DialogTitle>
                <DialogDescription>
                  {t("cashout_verify_pin_desc")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="pin" className="text-sm font-semibold">
                    {t("cashout_pin_label")}
                  </Label>
                  <Input
                    id="pin"
                    type="password"
                    placeholder={t("cashout_pin_placeholder")}
                    className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyPin()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  {t("cashout_cancel")}
                </Button>
                <Button onClick={handleVerifyPin} className="bg-primary hover:bg-primary/90">
                  {t("cashout_verify_btn")}
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
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount" className="text-sm font-semibold">
                    {t("cashout_amount_label")}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
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
                      <SelectItem value="withdrawal">{t("cashout_reason_withdrawal")}</SelectItem>
                      <SelectItem value="inventory">{t("cashout_reason_inventory")}</SelectItem>
                      <SelectItem value="salary_advance">{t("cashout_reason_salary")}</SelectItem>
                      <SelectItem value="broke_products">{t("cashout_reason_broke")}</SelectItem>
                      <SelectItem value="utility">{t("cashout_reason_utility")}</SelectItem>
                      <SelectItem value="other">{t("cashout_reason_other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
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
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-sm font-semibold">
                    {t("cashout_description_label")}
                  </Label>
                  <Input
                    id="description"
                    placeholder={t("cashout_description_placeholder")}
                    value={newExpense.description}
                    className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  {t("cashout_cancel")}
                </Button>
                <Button
                  onClick={handleAddExpense}
                  disabled={isCreatingExpense}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
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
