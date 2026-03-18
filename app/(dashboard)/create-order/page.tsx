"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clearCart, loadCart, saveCart } from "@/lib/cart-storage";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Menu } from "@/lib/menu-store";
import { Category, Inventory } from "@/lib/types";
import {
  useListCategoriesQuery,
  useUpdateCategoryMutation,
} from "@/stores/features/categories/categoriesApi";
import { useListInventoryQuery } from "@/stores/features/inventory/inventoryApi";
import {
  useListItemsQuery,
  useUpdateItemMutation,
} from "@/stores/features/items/itemsApi";
import { useCreateOrderMutation } from "@/stores/features/orders/ordersApi";
import { posPrinterService } from "@/stores/features/posPrinter/posPrinterApi";
import { useListStaffQuery } from "@/stores/features/staff/staffApi";
import { useListTablesQuery } from "@/stores/features/tables/tablesApi";
import { AlertCircle, Minus, Plus, Search, Star, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

type MenuCartItem = Menu & { quantity: number; type: "menu" };
type InventoryCartItem = Inventory & {
  quantity: number;
  type: "inventory";
};
type CartItem = MenuCartItem | InventoryCartItem;

const CREATE_ORDER_QUERY_OPTIONS = {
  refetchOnFocus: false,
  refetchOnReconnect: false,
  refetchOnMountOrArgChange: false,
} as const;

const WAITER_COLOR_CLASS: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-500",
  lime: "bg-lime-500",
  green: "bg-green-500",
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
};

const WAITER_COLOR_ITEM_CLASS: Record<string, string> = {
  red: "bg-red-50 text-red-900 border border-red-200 dark:bg-red-900/30 dark:text-red-100 dark:border-red-800",
  orange:
    "bg-orange-50 text-orange-900 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-100 dark:border-orange-800",
  amber:
    "bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-800",
  yellow:
    "bg-yellow-50 text-yellow-900 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-100 dark:border-yellow-800",
  lime: "bg-lime-50 text-lime-900 border border-lime-200 dark:bg-lime-900/30 dark:text-lime-100 dark:border-lime-800",
  green:
    "bg-green-50 text-green-900 border border-green-200 dark:bg-green-900/30 dark:text-green-100 dark:border-green-800",
  emerald:
    "bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-100 dark:border-emerald-800",
  blue: "bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-100 dark:border-blue-800",
  indigo:
    "bg-indigo-50 text-indigo-900 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-100 dark:border-indigo-800",
  purple:
    "bg-purple-50 text-purple-900 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-100 dark:border-purple-800",
  pink: "bg-pink-50 text-pink-900 border border-pink-200 dark:bg-pink-900/30 dark:text-pink-100 dark:border-pink-800",
};

export default function OrderPage() {
  // Route protection - Only cashiers and waiters can access this page
  const auth = useRequireAuth({
    allowedRoles: ["cashier", "waiter"],
    redirectTo: "/",
  });

  const restoredFromStorageRef = React.useRef(false);
  const [cart, setCart] = React.useState<CartItem[]>(() => {
    const stored = loadCart() as CartItem[] | null;
    if (stored && stored.length > 0) {
      restoredFromStorageRef.current = true;
      return stored;
    }
    return [];
  });
  const [selectedWaiter, setSelectedWaiter] = React.useState<string>("");
  const [selectedTable, setSelectedTable] = React.useState<string>("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [selectedInventoryCategory, setSelectedInventoryCategory] =
    React.useState<string>("all");
  const [activeTab, setActiveTab] = useState<"menu" | "inventory">("menu");
  const [orderNote, setOrderNote] = React.useState<string>("");
  const [markAsPaidToCashier, setMarkAsPaidToCashier] =
    React.useState<boolean>(false);
  const [withoutPrint, setWithoutPrint] = React.useState<boolean>(false);
  const [inventoryQuantities, setInventoryQuantities] = useState<
    Record<string, number>
  >({});
  const [searchQuery, setSearchQuery] = useState<string>("");

  // All hooks must be called before any conditional returns
  const [createOrder, { isLoading: isCreatingOrder }] =
    useCreateOrderMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const [updateItem] = useUpdateItemMutation();

  // Fetch data using Redux Toolkit Query
  const { data: waitersData, isLoading: waitersLoading } = useListStaffQuery({
    role: "waiter",
    status: "active",
  }, CREATE_ORDER_QUERY_OPTIONS);

  const { data: tablesData, isLoading: tablesLoading } = useListTablesQuery(
    undefined,
    CREATE_ORDER_QUERY_OPTIONS,
  );

  const { data: categoriesData, isLoading: categoriesLoading } =
    useListCategoriesQuery(undefined, CREATE_ORDER_QUERY_OPTIONS);

  const {
    data: itemsData,
    isLoading: itemsLoading,
    error: itemsError,
  } = useListItemsQuery(
    selectedCategory &&
      selectedCategory !== "all" &&
      selectedCategory.trim() !== ""
      ? { categoryId: selectedCategory }
      : undefined,
    CREATE_ORDER_QUERY_OPTIONS,
  );

  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    error: inventoryError,
    refetch: refetchInventory,
  } = useListInventoryQuery(
    selectedInventoryCategory &&
      selectedInventoryCategory !== "all" &&
      selectedInventoryCategory.trim() !== ""
      ? { categoryId: selectedInventoryCategory }
      : undefined,
    CREATE_ORDER_QUERY_OPTIONS,
  );

  const loading =
    waitersLoading ||
    tablesLoading ||
    categoriesLoading ||
    itemsLoading ||
    inventoryLoading;

  // Extract data from queries
  const waiters = waitersData?.staff || [];
  const tables = tablesData?.data || [];
  const categories = categoriesData || [];
  const items = React.useMemo(() => itemsData || [], [itemsData]);
  const inventoryItems = React.useMemo(
    () => inventoryData || [],
    [inventoryData],
  );

  const visibleMenuItems = React.useMemo(() => {
    return items.filter(
      (item: Menu) =>
        item.available &&
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [items, searchQuery]);

  const visibleInventoryItems = React.useMemo(() => {
    return inventoryItems.filter((item: Inventory) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [inventoryItems, searchQuery]);

  // Persist cart to localStorage
  useEffect(() => {
    if (cart.length > 0) {
      saveCart(cart);
    } else {
      clearCart();
    }
  }, [cart]);

  // Validate restored inventory items when inventory loads
  useEffect(() => {
    if (!restoredFromStorageRef.current || inventoryItems.length === 0 || cart.length === 0)
      return;
    const inventoryCartItems = cart.filter(
      (i): i is InventoryCartItem => i.type === "inventory",
    );
    if (inventoryCartItems.length === 0) return;
    const unavailable = inventoryCartItems.filter((item) => {
      const inv = inventoryItems.find((inv: Inventory) => inv.id === item.id);
      return !inv || item.quantity > inv.quantity;
    });
    if (unavailable.length > 0) {
      toast.error(
        `Some inventory items may no longer be available: ${unavailable.map((u) => u.name).join(", ")}. Please check quantities.`,
      );
    }
    restoredFromStorageRef.current = false;
  }, [cart, inventoryItems]);

  const toggleFavoriteMenu = async (item: Menu) => {
    try {
      await updateItem({
        id: item.id,
        data: { isFavorite: !item.isFavorite },
      }).unwrap();
      toast.success(
        !item.isFavorite ? "Added to favorites" : "Removed from favorites",
      );
    } catch {
      toast.error("Failed to update favorite status");
    }
  };

  const toggleFavoriteCategory = async (cat: Category) => {
    try {
      await updateCategory({
        id: cat.id,
        data: { isFavorite: !cat.isFavorite },
      }).unwrap();
      toast.success(
        !cat.isFavorite ? "Added to favorites" : "Removed from favorites",
      );
    } catch {
      toast.error("Failed to update favorite status");
    }
  };

  // Show loading while checking authorization
  if (auth.isChecking || !auth.hydrated) {
    return <Loading fullScreen text="Checking authorization..." size="lg" />;
  }

  // Don't render if not authorized (redirect handled by useRequireAuth)
  if (!auth.isAuthenticated || !auth.isAuthorized) {
    return null;
  }

  const addItem = (item: Menu) => {
    setCart((c) => {
      const itemId = item.id;
      const existingItem = c.find((i) => i.id === itemId && i.type === "menu");
      if (existingItem) {
        return c.map((i) =>
          i.id === itemId && i.type === "menu"
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [...c, { ...item, quantity: 1, type: "menu" as const }];
    });
  };

  const addInventoryItem = (item: Inventory) => {
    const quantity = inventoryQuantities[item.id] || 1;

    if (quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (quantity > item.quantity) {
      toast.error(
        `Insufficient stock. Available: ${item.quantity} ${item.unit}`,
      );
      return;
    }

    if (!item.price || item.price <= 0) {
      toast.error("This inventory item has no price set");
      return;
    }

    setCart((c) => {
      const itemId = item.id;
      const existingItem = c.find(
        (i) => i.id === itemId && i.type === "inventory",
      );
      if (existingItem) {
        const newQuantity =
          (existingItem as InventoryCartItem).quantity + quantity;
        if (newQuantity > item.quantity) {
          toast.error(
            `Cannot add more. Available: ${item.quantity} ${item.unit}`,
          );
          return c;
        }
        return c.map((i) =>
          i.id === itemId && i.type === "inventory"
            ? { ...i, quantity: newQuantity }
            : i,
        );
      }
      return [...c, { ...item, quantity, type: "inventory" as const }];
    });

    // Reset quantity input
    setInventoryQuantities((prev) => ({ ...prev, [item.id]: 1 }));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((c) => {
      const item = c.find((i) => i.id === itemId);
      if (!item) return c;

      // For inventory items, check available stock
      if (item.type === "inventory") {
        const inventoryItem = inventoryItems.find(
          (inv: Inventory) => inv.id === itemId,
        );
        if (inventoryItem) {
          const newQuantity = item.quantity + delta;
          if (newQuantity > inventoryItem.quantity) {
            toast.error(
              `Cannot increase quantity. Available: ${inventoryItem.quantity} ${inventoryItem.unit}`,
            );
            return c;
          }
          if (newQuantity <= 0) {
            return c.filter((i) => i.id !== itemId);
          }
          return c.map((i) =>
            i.id === itemId ? { ...i, quantity: newQuantity } : i,
          );
        }
      }

      // For menu items, no stock check needed
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        return c.filter((i) => i.id !== itemId);
      }
      return c.map((i) =>
        i.id === itemId ? { ...i, quantity: newQuantity } : i,
      );
    });
  };

  const removeItem = (itemId: string) => {
    setCart((c) => c.filter((i) => i.id !== itemId));
  };

  const totalItems = cart.reduce((acc, it) => acc + it.quantity, 0);

  const total = cart.reduce((acc: number, it: CartItem) => {
    if (it.type === "menu") {
      return acc + it.price * it.quantity;
    } else {
      return acc + it.price * it.quantity;
    }
  }, 0);

  const handleCreateOrder = async () => {
    if (isCreatingOrder) return;

    // Validation
    if (cart.length === 0) {
      toast.error(
        "Your cart is empty. Please add items before creating an order.",
      );
      return;
    }

    if (!selectedWaiter) {
      toast.error("Please select a waiter");
      return;
    }

    // Validate inventory quantities before submission
    for (const cartItem of cart) {
      if (cartItem.type === "inventory") {
        const inventoryItem = inventoryItems.find(
          (inv: Inventory) => inv.id === cartItem.id,
        );
        if (!inventoryItem) {
          toast.error(`Inventory item ${cartItem.name} not found`);
          return;
        }
        if (cartItem.quantity > inventoryItem.quantity) {
          toast.error(
            `Insufficient quantity for ${cartItem.name}. Available: ${inventoryItem.quantity} ${inventoryItem.unit}, Requested: ${cartItem.quantity}`,
          );
          return;
        }
      }
    }

    const hasInventoryItems = cart.some((item) => item.type === "inventory");

    try {
      // Validate item IDs are present
      const invalidItems = cart.filter(
        (item) => !item.id || item.id.trim() === "",
      );
      if (invalidItems.length > 0) {
        toast.error(
          "Some items have invalid IDs. Please refresh the page and try again.",
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
            (t._id || t.id) === selectedTable,
        );
        tableNumber = selectedTableObj?.tableNumber || undefined;
      }

      // Prepare order payload with clientId for idempotency (retries return same order)
      const requestId = uuidv4();
      const orderPayload = {
        ...(tableNumber && { tableNumber }),
        items: orderItems,
        waiterId: selectedWaiter,
        note: orderNote.trim() || undefined,
        customerChannel: "pos",
        clientId: requestId,
        ...(markAsPaidToCashier && { markAsPaidToCashier: true }),
      };

      // Create order
      const result = await createOrder(orderPayload).unwrap();

      // Success
      toast.success("Order created successfully!", {
        description: `Order #${result.orderNumber} has been created`,
      });

      // Automatically print receipt (client-side) - Non-blocking
      if (result.receiptText && !withoutPrint) {
        posPrinterService
          .print(result.receiptText)
          .then((printResult) => {
            if (!printResult.success) {
              toast.error("Printer Error", {
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

      // Clear cart and reset selections
      clearCart();
      setCart([]);
      setSelectedWaiter("");
      setSelectedTable("");
      setOrderNote("");
      setMarkAsPaidToCashier(false);
      setWithoutPrint(false);
      setInventoryQuantities({});

      // Only refresh stock when the order actually changed inventory.
      if (hasInventoryItems) {
        refetchInventory();
      }
    } catch (error: unknown) {
      console.error("Error creating order:", error);

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

      let errorMessage = "Failed to create order. Please try again.";

      if (typeof err?.data === "string") {
        errorMessage = err.data;
      } else if (err?.data && typeof err.data === "object") {
        errorMessage =
          err.data.error ||
          err.data.message ||
          err.data.details ||
          errorMessage;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error) {
        errorMessage = err.error;
      }

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-semibold">Create Order</h2>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-full h-10 border-border bg-background focus:ring-primary/20"
                />
              </div>
            </div>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "menu" | "inventory")}
            >
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
                <TabsTrigger value="menu">Menu Items</TabsTrigger>
                <TabsTrigger value="inventory">Inventory Items</TabsTrigger>
              </TabsList>

              <TabsContent value="menu" className="mt-0">
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
                          <div
                            key={category.id}
                            className="relative group shrink-0"
                          >
                            <button
                              onClick={() => {
                                setSelectedCategory(category.id);
                              }}
                              className={`capitalize shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap pr-8 ${
                                isSelected
                                  ? "text-primary bg-primary/10 border border-primary/20"
                                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
                              }`}
                            >
                              {category.name}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavoriteCategory(category);
                              }}
                              className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full transition-opacity ${
                                category.isFavorite
                                  ? "opacity-100 text-yellow-500"
                                  : "opacity-0 group-hover:opacity-50 text-muted-foreground"
                              }`}
                            >
                              <Star
                                className={`h-3 w-3 ${
                                  category.isFavorite ? "fill-current" : ""
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Menu Items list */}
                <div className="divide-y divide-border mt-4">
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
                    visibleMenuItems.map((item: Menu) => (
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
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => toggleFavoriteMenu(item)}
                                aria-label={
                                  item.isFavorite
                                    ? "Remove from favorites"
                                    : "Add to favorites"
                                }
                                title={
                                  item.isFavorite ? "Unfavorite" : "Favorite"
                                }
                              >
                                <Star
                                  className={
                                    item.isFavorite
                                      ? "h-5 w-5 fill-yellow-400 text-yellow-500"
                                      : "h-5 w-5"
                                  }
                                />
                              </Button>
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
              </TabsContent>

              <TabsContent value="inventory" className="mt-0">
                <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2">
                  <button
                    onClick={() => setSelectedInventoryCategory("all")}
                    className={`shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      selectedInventoryCategory === "all"
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
                        const isSelected =
                          selectedInventoryCategory === category.id;
                        return (
                          <div
                            key={category.id}
                            className="relative group shrink-0"
                          >
                            <button
                              onClick={() => {
                                setSelectedInventoryCategory(category.id);
                              }}
                              className={`capitalize shrink-0 px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap pr-8 ${
                                isSelected
                                  ? "text-primary bg-primary/10 border border-primary/20"
                                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
                              }`}
                            >
                              {category.name}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavoriteCategory(category);
                              }}
                              className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full transition-opacity ${
                                category.isFavorite
                                  ? "opacity-100 text-yellow-500"
                                  : "opacity-0 group-hover:opacity-50 text-muted-foreground"
                              }`}
                            >
                              <Star
                                className={`h-3 w-3 ${
                                  category.isFavorite ? "fill-current" : ""
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Inventory Items list */}
                <div className="divide-y divide-border mt-4">
                  {inventoryLoading ? (
                    <div className="px-6 py-8 text-center text-muted-foreground">
                      Loading inventory...
                    </div>
                  ) : inventoryError ? (
                    <div className="px-6 py-8 text-center text-destructive">
                      Failed to load inventory
                    </div>
                  ) : inventoryItems.length === 0 ? (
                    <div className="px-6 py-8 text-center text-muted-foreground">
                      No inventory items available
                    </div>
                  ) : (
                    visibleInventoryItems.map((item: Inventory) => {
                      const currentQuantity = inventoryQuantities[item.id] || 1;
                      const isLowStock = item.isLowStock || false;
                      const isOutOfStock = item.quantity === 0;
                      const maxQuantity = item.quantity;

                      return (
                        <div
                          key={item.id}
                          className="px-6 py-5 flex items-start gap-6 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-foreground text-lg font-semibold leading-tight">
                                    {item.name}
                                  </h4>
                                  {isLowStock && !isOutOfStock && (
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                                    >
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Low Stock
                                    </Badge>
                                  )}
                                  {isOutOfStock && (
                                    <Badge
                                      variant="outline"
                                      className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800"
                                    >
                                      Out of Stock
                                    </Badge>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {item.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2">
                                  <div className="text-sm text-muted-foreground">
                                    <span className="font-medium">Stock:</span>{" "}
                                    {item.quantity} {item.unit}
                                  </div>
                                  <div className="text-primary font-semibold text-base">
                                    Br {item.price.toFixed(2)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                  <label className="text-sm font-medium text-foreground">
                                    Quantity:
                                  </label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max={maxQuantity}
                                    value={currentQuantity}
                                    onChange={(e) => {
                                      const qty = parseInt(e.target.value) || 1;
                                      const clampedQty = Math.max(
                                        1,
                                        Math.min(qty, maxQuantity),
                                      );
                                      setInventoryQuantities((prev) => ({
                                        ...prev,
                                        [item.id]: clampedQty,
                                      }));
                                    }}
                                    className="w-20 h-8 text-sm"
                                    disabled={isOutOfStock}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    Max: {maxQuantity}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-4">
                                <Button
                                  onClick={() => addInventoryItem(item)}
                                  size={"sm"}
                                  className="px-6 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                  aria-label={`Add ${item.name}`}
                                  disabled={
                                    isOutOfStock ||
                                    currentQuantity <= 0 ||
                                    currentQuantity > maxQuantity
                                  }
                                >
                                  <Plus size={16} className="mr-1.5" />
                                  Add Item
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
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
                setOrderNote("");
                setMarkAsPaidToCashier(false);
                setInventoryQuantities({});
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
                      (waiter: {
                        _id?: string;
                        id?: string;
                        name: string;
                        color?: string;
                      }) => waiter._id || waiter.id,
                    )
                    .map(
                      (
                        waiter: {
                          _id?: string;
                          id?: string;
                          name: string;
                          color?: string;
                        },
                        index: number,
                      ) => {
                        const waiterId = waiter._id || waiter.id || "";
                        const itemClass = waiter.color
                          ? WAITER_COLOR_ITEM_CLASS[waiter.color]
                          : undefined;
                        return (
                          <SelectItem
                            key={waiterId || `waiter-${index}`}
                            value={waiterId}
                            className={
                              itemClass
                                ? `capitalize rounded-md my-1 mx-1`
                                : "capitalize"
                            }
                          >
                            <div
                              className={
                                itemClass
                                  ? `w-full px-2 py-1.5 rounded-md ${itemClass}`
                                  : "w-full"
                              }
                            >
                              {waiter.name}
                            </div>
                          </SelectItem>
                        );
                      },
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
                      }) => table._id || table.id,
                    )
                    .map(
                      (
                        table: {
                          _id?: string;
                          id?: string;
                          tableNumber: string;
                        },
                        index: number,
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
                      },
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

          {/* Cart Items List - Scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto max-h-[60vh] pr-1">
            <div className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-muted-foreground text-sm text-center py-8">
                  Your cart is empty
                </div>
              ) : (
                <>
                  {/* Menu Items Section */}
                  {cart.filter((item) => item.type === "menu").length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        Menu Items
                      </h4>
                      <div className="space-y-3">
                        {cart
                          .filter((item) => item.type === "menu")
                          .map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start justify-between gap-3"
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
                                  className="text-red-600 hover:text-destructive transition-colors p-1"
                                  aria-label="Remove item"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Inventory Items Section */}
                  {cart.filter((item) => item.type === "inventory").length >
                    0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        Inventory Items
                      </h4>
                      <div className="space-y-3">
                        {cart
                          .filter((item) => item.type === "inventory")
                          .map((item) => {
                            const inventoryItem = inventoryItems.find(
                              (inv: Inventory) => inv.id === item.id,
                            );
                            const availableQty = inventoryItem?.quantity || 0;
                            const cartQty = item.quantity;

                            return (
                              <div
                                key={item.id}
                                className="flex items-start justify-between gap-3"
                              >
                                <div className="flex flex-col flex-1 min-w-0">
                                  <h4 className="text-foreground font-medium text-sm leading-tight truncate">
                                    {item.name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Br {item.price.toFixed(2)} × {cartQty}{" "}
                                    {item.unit}
                                  </p>
                                  {cartQty > availableQty && (
                                    <p className="text-xs text-destructive mt-1">
                                      Available: {availableQty} {item.unit}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        updateQuantity(item.id, -1)
                                      }
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
                                      className="size-5 flex items-center justify-center rounded-md border border-border bg-background hover:bg-accent text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      aria-label="Increase quantity"
                                      disabled={cartQty >= availableQty}
                                    >
                                      <Plus size={12} />
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => removeItem(item.id)}
                                    className="text-red-600 hover:text-destructive transition-colors p-1"
                                    aria-label="Remove item"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </>
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

          <div className="mt-3 shrink-0 flex items-start gap-6 flex-wrap">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={markAsPaidToCashier}
                  onCheckedChange={(checked) =>
                    setMarkAsPaidToCashier(checked === true)
                  }
                />
                <span className="text-sm font-medium text-foreground">
                  Cash Recieved
                </span>
              </label>
              {markAsPaidToCashier && (
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  Order will be created with &quot;Paid to Cashier&quot; status
                </p>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={withoutPrint}
                  onCheckedChange={(checked) =>
                    setWithoutPrint(checked === true)
                  }
                />
                <span className="text-sm font-medium text-foreground">
                  Without Print
                </span>
              </label>
              {withoutPrint && (
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  Order will be created without printing a receipt
                </p>
              )}
            </div>
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
