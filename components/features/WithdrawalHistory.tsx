"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Withdrawal {
  _id?: string;
  id: string;
  amount: number;
  reason: string;
  description?: string;
  createdAt: string;
  createdBy?: {
    name: string;
    email: string;
  };
}

interface WithdrawalHistoryProps {
  withdrawals: Withdrawal[];
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

const REASON_LABELS: Record<string, string> = {
  cash: "Cash Advance",
  broke_products: "Broke Products",
  advance: "Advance Payment",
  deduction: "Deduction",
  loan: "Loan",
  other: "Other",
};

export function WithdrawalHistory({
  withdrawals,
  onDelete,
  isLoading = false,
}: WithdrawalHistoryProps) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);

  if (withdrawals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No withdrawals recorded
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Withdrawal History</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total:{" "}
          <span className="font-semibold text-red-600 dark:text-red-400">
            {totalWithdrawals.toFixed(2)} Br
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Description</TableHead>
              {onDelete && <TableHead className="w-20">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {withdrawals.map((withdrawal) => (
              <TableRow key={withdrawal._id || withdrawal.id}>
                <TableCell className="text-sm">
                  {formatDate(withdrawal.createdAt)}
                </TableCell>
                <TableCell className="font-medium text-red-600 dark:text-red-400">
                  {withdrawal.amount.toFixed(2)} Br
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {REASON_LABELS[withdrawal.reason] || withdrawal.reason}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {withdrawal.description || "-"}
                </TableCell>
                {onDelete && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onDelete(withdrawal._id || withdrawal.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
