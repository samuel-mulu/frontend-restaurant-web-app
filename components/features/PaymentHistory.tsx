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

export interface Payment {
  _id?: string;
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  remarks?: string;
  createdAt: string;
  createdBy?: {
    name: string;
    email: string;
  };
}

interface PaymentHistoryProps {
  payments: Payment[];
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  check: "Check",
  mobile_money: "Mobile Money",
  other: "Other",
};

export function PaymentHistory({
  payments,
  onDelete,
  isLoading = false,
}: PaymentHistoryProps) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No payments recorded
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Payment History</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total:{" "}
          <span className="font-semibold text-green-600 dark:text-green-400">
            {totalPayments.toFixed(2)} Br
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Remarks</TableHead>
              {onDelete && <TableHead className="w-20">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment._id || payment.id}>
                <TableCell className="text-sm">
                  {formatDate(payment.paymentDate)}
                </TableCell>
                <TableCell className="font-medium text-green-600 dark:text-green-400">
                  {payment.amount.toFixed(2)} Br
                </TableCell>
                <TableCell>
                  {payment.paymentMethod ? (
                    <Badge variant="outline">
                      {PAYMENT_METHOD_LABELS[payment.paymentMethod] ||
                        payment.paymentMethod}
                    </Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {payment.remarks || "-"}
                </TableCell>
                {onDelete && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onDelete(payment._id || payment.id)}
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
