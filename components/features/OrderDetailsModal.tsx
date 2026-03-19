"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loading } from "@/components/ui/loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  OrderItem,
  OrderStatus,
  useGetOrderQuery
} from "@/stores/features/orders/ordersApi";
import {
  AlertCircle,
  ArrowRightLeft,
  Ban,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  XCircle,
} from "lucide-react";
import React from "react";

interface OrderDetailsModalProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getStatusBadge = (
  status: OrderStatus,
  order?: { paymentMethod?: string },
) => {
  const statusMap: Record<
    OrderStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    OPEN: {
      label: "Open",
      className:
        "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
      icon: <AlertCircle className="h-3 w-3" />,
    },
    VOIDED: {
      label: "Voided",
      className: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
      icon: <Ban className="h-3 w-3" />,
    },
    PAID_TO_CASHIER: {
      label: "Paid to Waiter",
      className:
        "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    TRANSFERRED_TO_OWNER: {
      label: "Paid to Cashier",
      className:
        "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
      icon: <ArrowRightLeft className="h-3 w-3" />,
    },
    OWNER_CONFIRMED: {
      label: "Confirmed",
      className:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    DISPUTED: {
      label: "Disputed",
      className:
        "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const statusInfo = statusMap[status] || statusMap.OPEN;
  let label = statusInfo.label;
  if (status === "TRANSFERRED_TO_OWNER" && order?.paymentMethod) {
    label += ` (${order.paymentMethod === "mobile_banking" ? "Mobile Banking" : "Cash"})`;
  }
  return (
    <Badge className={`${statusInfo.className} flex items-center gap-1 w-fit`}>
      {statusInfo.icon}
      {label}
    </Badge>
  );
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch {
    return dateString;
  }
};

export function OrderDetailsModal({
  orderId,
  open,
  onOpenChange,
}: OrderDetailsModalProps) {
  const {
    data: order,
    isLoading,
    error,
  } = useGetOrderQuery(orderId || "", {
    skip: !orderId || !open,
  });

  if (!orderId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order Details</span>
            {order && getStatusBadge(order.status, order)}
          </DialogTitle>
          <DialogDescription>
            {order ? `Order #${order.orderNumber}` : "Loading order details..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8">
            <Loading text="Loading order details..." />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-destructive">
            Failed to load order details
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Order Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Order Number
                </p>
                <p className="text-lg font-semibold">{order.orderNumber}</p>
              </div>
              {order.tableNumber && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Table Number
                  </p>
                  <p className="text-lg font-semibold">
                    Table {order.tableNumber}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Waiter
                </p>
                <p className="text-base">
                  {typeof order.waiterId === "object" && order.waiterId?.name
                    ? order.waiterId.name
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Cashier
                </p>
                <p className="text-base">
                  {typeof order.cashierId === "object" && order.cashierId?.name
                    ? order.cashierId.name
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Created At
                </p>
                <p className="text-base">
                  {formatDate(order.placedAt || order.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Amount
                </p>
                <p className="text-lg font-bold text-primary">
                  Br {order.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Payment Info - show for paid orders */}
            {order.paymentMethod && (
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  {order.paymentMethod === "mobile_banking" ? (
                    <CreditCard className="h-4 w-4 text-primary" />
                  ) : (
                    <Banknote className="h-4 w-4 text-primary" />
                  )}
                  Payment Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Method</p>
                    <p className="font-medium capitalize">
                      {order.paymentMethod === "mobile_banking"
                        ? "Mobile Banking"
                        : "Cash"}
                    </p>
                  </div>
                  {order.paymentBankName && (
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Bank
                      </p>
                      <p className="font-medium">{order.paymentBankName}</p>
                    </div>
                  )}
                </div>

                {/* Payment proof image */}
                {order.paymentMethod === "mobile_banking" &&
                  order.paymentProofImage?.url && (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs">Payment Proof</p>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <img
                          src={order.paymentProofImage.url}
                          alt="Payment Proof"
                          className="w-full h-auto max-h-[260px] object-contain bg-background"
                        />
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Order Items */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Order Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item: OrderItem, index: number) => {
                      const itemName =
                        typeof item.itemId === "object" && item.itemId?.name
                          ? item.itemId.name
                          : item.nameSnapshot || "Unknown Item";
                      const unitPrice = item.priceSnapshot || 0;
                      const quantity = item.qty || 0;
                      const subtotal = unitPrice * quantity;

                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {itemName}
                          </TableCell>
                          <TableCell>{quantity}</TableCell>
                          <TableCell className="text-right">
                            Br {unitPrice.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            Br {subtotal.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Order Note */}
            {order.note && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Order Note
                </p>
                <p className="text-base bg-muted p-3 rounded-md">
                  {order.note}
                </p>
              </div>
            )}

            {/* Status Timeline */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Status Timeline</h3>
              <div className="space-y-2">
                {order.placedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Placed:</span>
                    <span>{formatDate(order.placedAt)}</span>
                  </div>
                )}
                {order.paymentReceivedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Payment Received:
                    </span>
                    <span>{formatDate(order.paymentReceivedAt)}</span>
                  </div>
                )}
                {order.paymentDeliveredAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Payment Delivered:
                    </span>
                    <span>{formatDate(order.paymentDeliveredAt)}</span>
                  </div>
                )}
                {order.completedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Completed:</span>
                    <span>{formatDate(order.completedAt)}</span>
                  </div>
                )}
                {order.cancelledAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Cancelled:</span>
                    <span>{formatDate(order.cancelledAt)}</span>
                    {typeof order.cancelledBy === "object" &&
                      order.cancelledBy?.name && (
                        <span className="text-muted-foreground">
                          by {order.cancelledBy.name}
                        </span>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
