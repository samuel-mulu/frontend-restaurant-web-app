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
            Record Cashout
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50">
          {!isPinVerified ? (
            <>
              <DialogHeader>
                <DialogTitle>Verify PIN</DialogTitle>
                <DialogDescription>
                  Enter the owner's PIN code to proceed with recording a cashout.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="pin" className="text-sm font-semibold">
                    PIN Code
                  </Label>
                  <Input
                    id="pin"
                    type="password"
                    placeholder="Enter PIN"
                    className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyPin()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleVerifyPin} className="bg-primary hover:bg-primary/90">
                  Verify PIN
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Record Cashout / Expense</DialogTitle>
                <DialogDescription>
                  Record withdrawals or other expenses for {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount" className="text-sm font-semibold">
                    Amount (ETB)
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
                    Reason
                  </Label>
                  <Select
                    value={newExpense.reason}
                    onValueChange={(v) => setNewExpense({ ...newExpense, reason: v })}
                  >
                    <SelectTrigger id="reason">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="withdrawal">General Withdrawal</SelectItem>
                      <SelectItem value="inventory">Inventory Purchase</SelectItem>
                      <SelectItem value="salary_advance">Salary Advance</SelectItem>
                      <SelectItem value="broke_products">Broke Products</SelectItem>
                      <SelectItem value="utility">Utilities / Repairs</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expenseType" className="text-sm font-semibold">
                    Expense Type
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
                    Description (Optional)
                  </Label>
                  <Input
                    id="description"
                    placeholder="Additional details..."
                    value={newExpense.description}
                    className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddExpense}
                  disabled={isCreatingExpense}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {isCreatingExpense ? "Recording..." : "Save Transaction"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
