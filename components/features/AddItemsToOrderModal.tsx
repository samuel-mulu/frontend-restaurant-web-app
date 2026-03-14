"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Menu } from "@/lib/menu-store";
import { Inventory } from "@/lib/types";
import { useListInventoryQuery } from "@/stores/features/inventory/inventoryApi";
import { useListItemsQuery } from "@/stores/features/items/itemsApi";
import {
  Order,
  OrderItem,
  useGetOrderQuery,
  useUpdateOrderMutation,
  useUpdateOrderStatusMutation,
} from "@/stores/features/orders/ordersApi";
import { posPrinterService } from "@/stores/features/posPrinter/posPrinterApi";
import { AlertCircle, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type CartLine = {
  itemId: string;
  qty: number;
  nameSnapshot: string;
  priceSnapshot: number;
};

function getOrderItemId(item: OrderItem): string {
  if (typeof item.itemId === "string") return item.itemId;
  if (!item.itemId) return "";
  const idValue = (item.itemId as any)._id || (item.itemId as any).id;
  if (typeof idValue === "string") return idValue;
  return "";
}

function toCartLine(item: OrderItem): CartLine {
  return {
    itemId: getOrderItemId(item),
    qty: item.qty,
    nameSnapshot: item.nameSnapshot,
    priceSnapshot: item.priceSnapshot,
  };
}

function formatMoney(amount: number): string {
  return `Br ${amount.toFixed(2)}`;
}

export interface AddItemsToOrderModalProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function AddItemsToOrderModalBody({
  order,
  onClose,
  onSuccess,
}: {
  order: Order;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { data: items = [], isLoading: isItemsLoading } = useListItemsQuery({
    includeUnavailable: true,
  });

  const { data: inventoryItems = [], isLoading: isInventoryLoading } =
    useListInventoryQuery(undefined);

  const [updateOrder, { isLoading: isUpdating }] = useUpdateOrderMutation();
  const [updateOrderStatus, { isLoading: isUpdatingStatus }] = useUpdateOrderStatusMutation();
  const isAnyUpdating = isUpdating || isUpdatingStatus;

  const [activeTab, setActiveTab] = useState<"menu" | "inventory">("menu");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [inventoryQuantities, setInventoryQuantities] = useState<
    Record<string, number>
  >({});

  const [cart, setCart] = useState<CartLine[]>(() =>
    (order.items || [])
      .map(toCartLine)
      .filter((line) => !!line.itemId || !!line.nameSnapshot),
  );

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, line) => sum + line.priceSnapshot * line.qty, 0);
  }, [cart]);

  const cartCount = useMemo(
    () => cart.reduce((sum, line) => sum + line.qty, 0),
    [cart],
  );

  const inventoryById = useMemo(() => {
    const map = new Map<string, Inventory>();
    inventoryItems.forEach((invItem: Inventory) =>
      map.set(invItem.id, invItem),
    );
    return map;
  }, [inventoryItems]);

  const addMenuItem = (item: Menu) => {
    if (!item.available) {
      toast.error("This item is not available");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((l: CartLine) => l.itemId === item.id);
      if (existing) {
        return prev.map((l: CartLine) =>
          l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          qty: 1,
          nameSnapshot: item.name,
          priceSnapshot: item.price,
        },
      ];
    });
  };

  const addInventoryItem = (item: Inventory) => {
    const desiredQty = inventoryQuantities[item.id] || 1;

    if (desiredQty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (desiredQty > item.quantity) {
      toast.error(
        `Insufficient stock. Available: ${item.quantity} ${item.unit}`,
      );
      return;
    }

    if (!item.price || item.price <= 0) {
      toast.error("This inventory item has no price set");
      return;
    }

    setCart((prev: CartLine[]) => {
      const existing = prev.find((l: CartLine) => l.itemId === item.id);
      if (existing) {
        const nextQty = existing.qty + desiredQty;
        if (nextQty > item.quantity) {
          toast.error(
            `Cannot add more. Available: ${item.quantity} ${item.unit}`,
          );
          return prev;
        }
        return prev.map((l: CartLine) =>
          l.itemId === item.id ? { ...l, qty: nextQty } : l,
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          qty: desiredQty,
          nameSnapshot: item.name,
          priceSnapshot: item.price,
        },
      ];
    });

    setInventoryQuantities((p) => ({ ...p, [item.id]: 1 }));
  };

  const updateLineQty = (itemId: string, delta: number) => {
    setCart((prev: CartLine[]) => {
      const existing = prev.find((l: CartLine) => l.itemId === itemId);
      if (!existing) return prev;

      const inv = inventoryById.get(itemId);
      const nextQty = existing.qty + delta;

      if (nextQty <= 0) {
        return prev.filter((l: CartLine) => l.itemId !== itemId);
      }

      if (inv && nextQty > inv.quantity) {
        toast.error(
          `Cannot increase quantity. Available: ${inv.quantity} ${inv.unit}`,
        );
        return prev;
      }

      return prev.map((l: CartLine) =>
        l.itemId === itemId ? { ...l, qty: nextQty } : l,
      );
    });
  };

  const removeLine = (itemId: string) => {
    setCart((prev: CartLine[]) =>
      prev.filter((l: CartLine) => l.itemId !== itemId),
    );
  };

  const handleSave = async (payAfterSave: boolean = false) => {
    if (!order.id && !order._id) return;

    if (cart.length === 0) {
      toast.error("Order must have at least one item");
      return;
    }

    for (const line of cart) {
      const inv = inventoryById.get(line.itemId);
      if (inv && line.qty > inv.quantity) {
        toast.error(
          `Insufficient stock for ${inv.name}. Available: ${inv.quantity} ${inv.unit}, Requested: ${line.qty}`,
        );
        return;
      }
    }

    try {
      await updateOrder({
        id: order.id || order._id || "",
        data: {
          items: cart.map((l: CartLine) => ({
            itemId: l.itemId,
            qty: l.qty,
            nameSnapshot: l.nameSnapshot,
            priceSnapshot: l.priceSnapshot,
          })),
        },
      }).unwrap();

      if (payAfterSave) {
        const result = await updateOrderStatus({
          id: order.id || order._id || "",
          status: "PAID_TO_CASHIER",
          paymentMethod: "cash",
        }).unwrap();

        toast.success("Order updated and paid successfully");

        // Print receipt if status changed to PAID_TO_CASHIER
        if (result.receiptText) {
          posPrinterService
            .print(result.receiptText)
            .then((printResult: any) => {
              if (!printResult.success) {
                toast.error(`Printer Error (Order #${result.orderNumber})`, {
                  description:
                    printResult.error || "Could not print receipt locally.",
                });
              }
            })
            .catch(() => {
              toast.error("Printer Error", {
                description: "POS Printer Service is not reachable.",
              });
            });
        }
      } else {
        toast.success("Order updated successfully");
      }
      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      const e = err as {
        data?: { message?: string; error?: string };
        message?: string;
      };
      toast.error(
        e?.data?.message ||
        e?.data?.error ||
        e?.message ||
        "Failed to update order",
      );
    }
  };

  const filteredMenuItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items
      .filter((i: Menu) => i.available)
      .filter((i: Menu) => (q ? i.name.toLowerCase().includes(q) : true));
  }, [items, searchQuery]);

  const filteredInventoryItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inventoryItems.filter((i: Inventory) =>
      q ? i.name.toLowerCase().includes(q) : true,
    );
  }, [inventoryItems, searchQuery]);

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isAnyUpdating}>
          Cancel
        </Button>
        <Button onClick={() => handleSave(false)} disabled={isAnyUpdating}>
          {isUpdating && !isUpdatingStatus ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
        <Button
          onClick={() => handleSave(true)}
          disabled={isAnyUpdating}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isUpdatingStatus ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            "Save & Pay"
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-3 rounded-lg border bg-card flex flex-col min-h-0">
          <div className="p-4 flex flex-col gap-4 flex-1 min-h-0">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "menu" | "inventory")}
              >
                <TabsList>
                  <TabsTrigger value="menu">Menu</TabsTrigger>
                  <TabsTrigger value="inventory">Inventory</TabsTrigger>
                </TabsList>
                <TabsContent value={activeTab} className="mt-0" />
              </Tabs>

              <div className="relative w-full sm:w-[320px]">
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-full"
                />
              </div>
            </div>

            {activeTab === "menu" ? (
              <div className="divide-y divide-border flex-1 min-h-0 overflow-y-auto">
                {isItemsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading menu items...
                  </div>
                ) : filteredMenuItems.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No menu items found
                  </div>
                ) : (
                  filteredMenuItems.map((item: Menu) => (
                    <div
                      key={item.id}
                      className="py-4 flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">
                          {item.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatMoney(item.price)}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addMenuItem(item)}
                        className="shrink-0"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="divide-y divide-border flex-1 min-h-0 overflow-y-auto">
                {isInventoryLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading inventory...
                  </div>
                ) : filteredInventoryItems.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No inventory items found
                  </div>
                ) : (
                  filteredInventoryItems.map((inv: Inventory) => {
                    const currentQty = inventoryQuantities[inv.id] || 1;
                    const isOut = inv.quantity === 0;
                    return (
                      <div
                        key={inv.id}
                        className="py-4 flex items-start justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-foreground truncate">
                              {inv.name}
                            </div>
                            {inv.isLowStock && !isOut && (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200"
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Low
                              </Badge>
                            )}
                            {isOut && (
                              <Badge
                                variant="outline"
                                className="bg-red-50 text-red-700 border-red-200"
                              >
                                Out
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Stock: {inv.quantity} {inv.unit} ·{" "}
                            {formatMoney(inv.price)}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Qty
                            </span>
                            <Input
                              type="number"
                              min={1}
                              max={inv.quantity}
                              value={currentQty}
                              onChange={(e) => {
                                const n = parseInt(e.target.value) || 1;
                                const clamped = Math.max(
                                  1,
                                  Math.min(n, Math.max(1, inv.quantity)),
                                );
                                setInventoryQuantities((p) => ({
                                  ...p,
                                  [inv.id]: clamped,
                                }));
                              }}
                              className="w-20 h-8 text-sm"
                              disabled={isOut}
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addInventoryItem(inv)}
                          disabled={isOut || currentQty > inv.quantity}
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="lg:col-span-2 rounded-lg border bg-card flex flex-col min-h-0">
          <div className="p-4 flex flex-col gap-4 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Order Items</div>
              <div className="text-sm text-muted-foreground">
                {cartCount} item(s)
              </div>
            </div>

            <div className="text-sm font-semibold text-primary">
              Total: {formatMoney(cartTotal)}
            </div>

            <div className="border-t pt-3 flex-1 overflow-y-auto min-h-0 pr-1">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  No items in this order
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((line: CartLine) => {
                    const inv = inventoryById.get(line.itemId);
                    const stockText = inv
                      ? `Stock: ${inv.quantity} ${inv.unit}`
                      : null;

                    return (
                      <div
                        key={line.itemId}
                        className="rounded-md border p-3 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {line.nameSnapshot}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatMoney(line.priceSnapshot)}
                            {stockText ? ` · ${stockText}` : ""}
                          </div>
                          {inv && line.qty > inv.quantity && (
                            <div className="text-xs text-destructive mt-1">
                              Requested exceeds stock
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateLineQty(line.itemId, -1)}
                            disabled={isAnyUpdating}
                            title="Decrease"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="w-10 text-center font-semibold">
                            {line.qty}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateLineQty(line.itemId, 1)}
                            disabled={isAnyUpdating}
                            title="Increase"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeLine(line.itemId)}
                            disabled={isAnyUpdating}
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

export function AddItemsToOrderModal({
  orderId,
  open,
  onOpenChange,
  onSuccess,
}: AddItemsToOrderModalProps) {
  const {
    currentData: order,
    isLoading: isOrderLoading,
    isFetching: isOrderFetching,
    error: orderError,
  } = useGetOrderQuery(orderId || "", {
    skip: !orderId || !open,
  });
  const isWaitingForCurrentOrder =
    open && !!orderId && (isOrderLoading || (isOrderFetching && !order));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] overflow-hidden bg-card border-border flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Items to Order</DialogTitle>
          <DialogDescription>
            {order?.orderNumber
              ? `Order #${order.orderNumber}`
              : "Update order items"}
          </DialogDescription>
        </DialogHeader>

        {isWaitingForCurrentOrder ? (
          <div className="py-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading order...
          </div>
        ) : orderError ? (
          <div className="py-10 text-center text-destructive">
            Failed to load order
          </div>
        ) : order ? (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <AddItemsToOrderModalBody
              key={order.id || order._id}
              order={order}
              onClose={() => onOpenChange(false)}
              onSuccess={onSuccess}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
