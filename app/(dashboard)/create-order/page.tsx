"use client";

import React, { useEffect } from "react";
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
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [selectedWaiter, setSelectedWaiter] = React.useState<string>("");
  const [selectedTable, setSelectedTable] = React.useState<string>("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [orderNote, setOrderNote] = React.useState<string>("");

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

    if (!selectedTable) {
      toast.error("Please select a table");
      return;
    }

    try {
      // Transform cart items to order items format
      const orderItems = cart.map((item) => ({
        itemId: item.id,
        qty: item.quantity,
        nameSnapshot: item.name,
        priceSnapshot: item.price,
      }));

      // Get table number from selected table ID
      const selectedTableObj = tables.find(
        (t: { _id?: string; id?: string; tableNumber: string }) =>
          (t._id || t.id) === selectedTable
      );
      const tableNumber = selectedTableObj?.tableNumber || "";

      if (!tableNumber) {
        toast.error("Invalid table selection");
        return;
      }

      // Create order
      const result = await createOrder({
        tableNumber,
        items: orderItems,
        waiterId: selectedWaiter,
        note: orderNote.trim() || undefined,
      }).unwrap();

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
      const err = error as {
        data?: { error?: string; message?: string };
        message?: string;
      };
      const errorMessage =
        err?.data?.error ||
        err?.data?.message ||
        err?.message ||
        "Failed to create order. Please try again.";
      toast.error("Failed to create order", {
        description: errorMessage,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fa] ">
      <div className=" mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-[#eef2f6]">
          <div className="px-8 pt-6">
            <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide pb-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`shrink-0 px-4 py-2 rounded-md font-semibold transition-colors ${
                  selectedCategory === "all"
                    ? "text-[#e11d2f] bg-[#fee2e2]"
                    : "text-[#6b7b88] hover:text-[#163a5b]"
                }`}
              >
                All Categories
              </button>
              {categoriesLoading ? (
                <div className="text-[#6b7b88] text-sm">
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
                        className={`capitalize shrink-0 px-4 py-2 rounded-md font-semibold transition-colors whitespace-nowrap ${
                          isSelected
                            ? "text-[#e11d2f] bg-[#fee2e2]"
                            : "text-[#6b7b88] hover:text-[#163a5b]"
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
          <div className="divide-y divide-[#eef2f6]">
            {itemsLoading ? (
              <div className="px-8 py-6 text-center text-[#6b7b88]">
                Loading items...
              </div>
            ) : itemsError ? (
              <div className="px-8 py-6 text-center text-red-600">
                Failed to load items
              </div>
            ) : items.length === 0 ? (
              <div className="px-8 py-6 text-center text-[#6b7b88]">
                No items available
              </div>
            ) : (
              items
                .filter((item: Menu) => item.available)
                .map((item: Menu) => (
                  <div
                    key={item.id}
                    className="px-8 py-6 flex items-start gap-6"
                  >
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-[#0b3b66] text-lg font-bold leading-tight">
                            {item.name}
                          </h4>

                          <div className="text-[#e11d2f] font-semibold text-sm mt-2">
                            Br {item.price.toFixed(2)}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-4">
                          <Button
                            onClick={() => addItem(item)}
                            size={"sm"}
                            className="px-6 w-full rounded-full bg-[#0b3b66] text-white shadow-lg shadow-[#0b3b66]/30 hover:bg-[#092c58]"
                            aria-label={`Add ${item.name}`}
                          >
                            <Plus size={16} />
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
        <aside className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-[#eef2f6] p-6 h-fit">
          <div className="flex justify-between">
            <h3 className="text-[#163a5b] text-2xl font-bold">Your Order</h3>
            <Button
              size={"sm"}
              variant="outline"
              className="rounded-full text-red-600 py-0"
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
          <div className="mt-4 flex gap-3">
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
                  <SelectValue placeholder="Select table" />
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

          <div className="mt-4 flex items-center justify-between">
            <div className="text-[#163a5b] font-semibold">
              Total ({totalItems} items)
            </div>
            <div className="text-[#0b3b66] font-semibold">Br {total}</div>
          </div>

          <hr className="my-4 border-t border-[#eef2f6]" />

          {/* Cart Items List */}
          <div className="space-y-4">
            {cart.map((item) => {
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex flex-col">
                    <h4 className="text-[#0b3b66] font-semibold text-sm leading-tight">
                      {item.name}
                    </h4>
                    <p>{item.price.toFixed(2)} ብር</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-[#e6ecf2] text-[#6b7b88] hover:bg-[#f6f8fa] transition"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-medium text-[#163a5b] min-w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-[#e6ecf2] text-[#6b7b88] hover:bg-[#f6f8fa] transition"
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-[#6b7b88] hover:text-[#e11d2f] transition p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {cart.length === 0 && (
            <div className="text-[#6b7b88] text-sm text-center py-8">
              Your cart is empty
            </div>
          )}

          <hr className="my-4 border-t border-[#eef2f6]" />

          <div className="mt-2">
            <label className="text-sm font-medium text-[#163a5b] mb-2 block">
              Order Note (Optional)
            </label>
            <Input
              type="text"
              placeholder="Add a note to this order..."
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              className="w-full rounded-md border border-[#eef2f6] bg-white text-[#163a5b] placeholder:text-[#6b7b88] focus:border-[#0b3b66]"
            />
          </div>

          <Button
            size={"sm"}
            onClick={handleCreateOrder}
            disabled={
              cart.length === 0 ||
              !selectedWaiter ||
              !selectedTable ||
              isCreatingOrder
            }
            className="mt-4 w-full rounded-full bg-[#0b3b66] text-white shadow-lg shadow-[#0b3b66]/30 hover:bg-[#092c58] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingOrder ? "Creating Order..." : "Create Order"}
          </Button>
        </aside>
      </div>
    </div>
  );
}
