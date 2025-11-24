"use client";

import React, { useEffect } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Loading } from "@/components/ui/loading";
import { Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useListStaffQuery } from "@/stores/features/staff/staffApi";
import { useListTablesQuery } from "@/stores/features/tables/tablesApi";
import { useListItemsQuery } from "@/stores/features/items/itemsApi";
import { useListCategoriesQuery } from "@/stores/features/categories/categoriesApi";
import { useCreateOrderMutation } from "@/stores/features/orders/ordersApi";
import { Menu } from "@/lib/menu-store";
import { Category } from "@/lib/types";
import { toast } from "sonner";

type CartItem = Menu & { quantity: number };

export default function PixelPerfectMenu() {
  // Route protection - Only cashiers and waiters can access this page
  const auth = useRequireAuth({
    allowedRoles: ["cashier", "waiter"],
    redirectTo: "/",
  });

  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [selectedWaiter, setSelectedWaiter] = React.useState<string>("");
  const [selectedTable, setSelectedTable] = React.useState<string>("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [orderNote, setOrderNote] = React.useState<string>("");

  // Show loading while checking authorization
  if (auth.isChecking || !auth.hydrated) {
    return <Loading fullScreen text="Checking authorization..." size="lg" />;
  }

  // Don't render if not authorized (redirect handled by useRequireAuth)
  if (!auth.isAuthenticated || !auth.isAuthorized) {
    return null;
  }

  const [createOrder, { isLoading: isCreatingOrder }] =
    useCreateOrderMutation();

  // Fetch data using Redux Toolkit Query
  const { data: waitersData, isLoading: waitersLoading } = useListStaffQuery({
    role: "waiter",
    status: "active",
  });

  const { data: tablesData, isLoading: tablesLoading } = useListTablesQuery();

  const { data: categoriesData, isLoading: categoriesLoading } =
    useListCategoriesQuery();

  const {
    data: itemsData,
    isLoading: itemsLoading,
    error: itemsError,
  } = useListItemsQuery(
    selectedCategory &&
      selectedCategory !== "all" &&
      selectedCategory.trim() !== ""
      ? { categoryId: selectedCategory }
      : undefined
  );

  const waiters = waitersData?.staff || [];
  const tables = tablesData?.data || [];
  const categories = categoriesData || [];
  const items = itemsData || [];

  const loading =
    waitersLoading || tablesLoading || categoriesLoading || itemsLoading;

  useEffect(() => {
    console.log("waiter", waitersData);
  }, [waitersData]);

  const addItem = (item: Menu) => {
    setCart((c) => {
      const itemId = item.id;
      const existingItem = c.find((i) => i.id === itemId);
      if (existingItem) {
        return c.map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...c, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((c) => {
      const item = c.find((i) => i.id === itemId);
      if (!item) return c;

      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        return c.filter((i) => i.id !== itemId);
      }
      return c.map((i) =>
        i.id === itemId ? { ...i, quantity: newQuantity } : i
      );
    });
  };

  const removeItem = (itemId: string) => {
    setCart((c) => c.filter((i) => i.id !== itemId));
  };

  const totalItems = cart.reduce((acc, it) => acc + it.quantity, 0);

  const total = cart.reduce(
    (acc: number, it: CartItem) => acc + it.price * it.quantity,
    0
  );

  const handleCreateOrder = async () => {
    // Validation
    if (cart.length === 0) {
      toast.error(
        "Your cart is empty. Please add items before creating an order."
      );
      return;
    }

    if (!selectedWaiter) {
      toast.error("Please select a waiter");
      return;
    }

    try {
      // Validate item IDs are present
      const invalidItems = cart.filter(
        (item) => !item.id || item.id.trim() === ""
      );
      if (invalidItems.length > 0) {
        toast.error(
          "Some items have invalid IDs. Please refresh the page and try again."
        );
        return;
      }

      // Transform cart items to order items format
      const orderItems = cart.map((item) => ({
        itemId: item.id,
        qty: item.quantity,
        nameSnapshot: item.name,
        priceSnapshot: item.price,
      }));

      // Get table number from selected table ID (optional)
      let tableNumber: string | undefined = undefined;
      if (selectedTable) {
        const selectedTableObj = tables.find(
          (t: { _id?: string; id?: string; tableNumber: string }) =>
            (t._id || t.id) === selectedTable
        );
        tableNumber = selectedTableObj?.tableNumber || undefined;
      }

      // Prepare order payload
      const orderPayload = {
        ...(tableNumber && { tableNumber }), // Only include if table is selected
        items: orderItems,
        waiterId: selectedWaiter,
        note: orderNote.trim() || undefined,
        customerChannel: "pos", // POS system for cashier-created orders
      };

      // Log the payload for debugging
      console.log(
        "Creating order with payload:",
        JSON.stringify(orderPayload, null, 2)
      );

      // Create order
      const result = await createOrder(orderPayload).unwrap();

      // Success
      toast.success("Order created successfully!", {
        description: `Order #${result.orderNumber} has been created`,
      });

      // Clear cart and reset selections
      setCart([]);
      setSelectedWaiter("");
      setSelectedTable("");
      setOrderNote("");
    } catch (error: unknown) {
      console.error("Error creating order:", error);

      // Handle RTK Query error format
      // RTK Query errors have structure: { status: number, data: {...} }
      const err = error as {
        status?: number | string;
        data?:
          | string
          | { error?: string; message?: string; details?: string }
          | null
          | undefined;
        error?: string;
        message?: string;
      };

      // Extract error message from various possible locations
      let errorMessage = "Failed to create order. Please try again.";

      // Check if data is a string (some APIs return error as string)
      if (typeof err?.data === "string") {
        errorMessage = err.data;
      }
      // Check if data is an object with error/message
      else if (err?.data && typeof err.data === "object") {
        errorMessage =
          err.data.error ||
          err.data.message ||
          err.data.details ||
          errorMessage;
      }
      // Check top-level message
      else if (err?.message) {
        errorMessage = err.message;
      }
      // Check top-level error
      else if (err?.error) {
        errorMessage = err.error;
      }

      // Log full error structure for debugging
      console.error("Error structure:", {
        status: err?.status,
        data: err?.data,
        message: err?.message,
        error: err?.error,
        fullError: error,
      });

      toast.error("Failed to create order", {
        description: errorMessage,
      });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6 p-4 lg:p-6">
        <div className="lg:col-span-3 bg-card rounded-lg shadow-sm border border-border">
          <div className="px-6 pt-5 pb-3">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedCategory === "all"
                    ? "text-primary bg-primary/10 border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                All Categories
              </button>
              {categoriesLoading ? (
                <div className="text-muted-foreground text-sm">
                  Loading categories...
                </div>
              ) : (
                categories
                  .filter((category: Category) => category.id)
                  .map((category: Category) => {
                    const isSelected = selectedCategory === category.id;
                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          setSelectedCategory(category.id);
                        }}
                        className={`capitalize shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                          isSelected
                            ? "text-primary bg-primary/10 border border-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        {category.name}
                      </button>
                    );
                  })
              )}
            </div>
          </div>

          {/* Items list */}
          <div className="divide-y divide-border">
            {itemsLoading ? (
              <div className="px-6 py-8 text-center text-muted-foreground">
                Loading items...
              </div>
            ) : itemsError ? (
              <div className="px-6 py-8 text-center text-destructive">
                Failed to load items
              </div>
            ) : items.length === 0 ? (
              <div className="px-6 py-8 text-center text-muted-foreground">
                No items available
              </div>
            ) : (
              items
                .filter((item: Menu) => item.available)
                .map((item: Menu) => (
                  <div
                    key={item.id}
                    className="px-6 py-5 flex items-start gap-6 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="text-foreground text-lg font-semibold leading-tight">
                            {item.name}
                          </h4>

                          <div className="text-primary font-semibold text-base mt-2">
                            Br {item.price.toFixed(2)}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-4">
                          <Button
                            onClick={() => addItem(item)}
                            size={"sm"}
                            className="px-6 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                            aria-label={`Add ${item.name}`}
                          >
                            <Plus size={16} className="mr-1.5" />
                            Add Item
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Right: order summary */}
        <aside className="lg:col-span-2 bg-card rounded-lg shadow-sm border border-border px-6 py-2 flex flex-col h-fit max-h-[96vh] sticky top-4">
          <div className="flex justify-between items-center shrink-0">
            <h3 className="text-foreground text-2xl font-semibold">
              Your Order
            </h3>
            <Button
              size={"sm"}
              variant="outline"
              className="rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              onClick={() => {
                setCart([]);
                setSelectedWaiter("");
                setSelectedTable("");
              }}
            >
              Clear
            </Button>
          </div>

          {/* Waiter and Table Selection */}
          <div className="mt-5 flex gap-2 shrink-0">
            <div className="flex-1">
              <Select
                value={selectedWaiter}
                onValueChange={setSelectedWaiter}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select waiter" />
                </SelectTrigger>
                <SelectContent>
                  {waiters
                    .filter(
                      (waiter: { _id?: string; id?: string; name: string }) =>
                        waiter._id || waiter.id
                    )
                    .map(
                      (
                        waiter: { _id?: string; id?: string; name: string },
                        index: number
                      ) => {
                        const waiterId = waiter._id || waiter.id || "";
                        return (
                          <SelectItem
                            key={waiterId || `waiter-${index}`}
                            value={waiterId}
                            className="capitalize"
                          >
                            {waiter.name}
                          </SelectItem>
                        );
                      }
                    )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select
                value={selectedTable}
                onValueChange={setSelectedTable}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select table (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {tables
                    .filter(
                      (table: {
                        _id?: string;
                        id?: string;
                        tableNumber: string;
                      }) => table._id || table.id
                    )
                    .map(
                      (
                        table: {
                          _id?: string;
                          id?: string;
                          tableNumber: string;
                        },
                        index: number
                      ) => {
                        const tableId = table._id || table.id || "";
                        return (
                          <SelectItem
                            key={tableId || `table-${index}`}
                            value={tableId}
                          >
                            Table {table.tableNumber}
                          </SelectItem>
                        );
                      }
                    )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 px-1 flex items-center justify-between shrink-0">
            <div className="text-foreground font-semibold text-sm">
              Total ({totalItems} {totalItems === 1 ? "item" : "items"})
            </div>
            <div className="text-primary font-bold text-lg">
              Br {total.toFixed(2)}
            </div>
          </div>

          <hr className="my-4 border-t border-border shrink-0" />

          {/* Cart Items List - Scrollable, max 4 items visible */}
          <div className="flex-1 min-h-0 overflow-y-auto max-h-[60vh] pr-1">
            <div className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-muted-foreground text-sm text-center py-8">
                  Your cart is empty
                </div>
              ) : (
                cart.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 "
                    >
                      <div className="flex flex-col flex-1 min-w-0">
                        <h4 className="text-foreground font-medium text-sm leading-tight truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Br {item.price.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="size-5 flex items-center justify-center rounded-md border border-border bg-background hover:bg-accent text-foreground transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-semibold text-foreground min-w-7 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="size-5 flex items-center justify-center rounded-md border border-border bg-background hover:bg-accent text-foreground transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-600  hover:text-destructive transition-colors p-1"
                          aria-label="Remove item "
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <hr className="my-4 border-t border-border shrink-0" />

          <div className="mt-2 shrink-0">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Order Note (Optional)
            </label>
            <Input
              type="text"
              placeholder="Add a note to this order..."
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              className="w-full"
            />
          </div>

          <Button
            size={"sm"}
            onClick={handleCreateOrder}
            disabled={cart.length === 0 || !selectedWaiter || isCreatingOrder}
            className="mt-4 w-full rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-10"
          >
            {isCreatingOrder ? "Creating Order..." : "Create Order"}
          </Button>
        </aside>
      </div>
    </div>
  );
}
