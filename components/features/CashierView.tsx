"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Minus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CartItem, MenuItem } from "@/lib/types";
import { type Menu } from "@/lib/menu-store";
import { Category } from "@/lib/types";
import {
  getCategories,
  ApiError as CategoryApiError,
} from "@/lib/api/categories";
import { getItems, ApiError as ItemApiError } from "@/lib/api/items";
import {
  createOrder,
  ApiError as OrderApiError,
  type CreateOrderInput,
} from "@/lib/api/orders";

const waiters: string[] = [
  "John Smith",
  "Sarah Johnson",
  "Michael Brown",
  "Emily Davis",
  "David Wilson",
];

const tables: string[] = [
  "Table 1",
  "Table 2",
  "Table 3",
  "Table 4",
  "Table 5",
  "Table 6",
  "Table 7",
  "Table 8",
];

export function CashierView() {
  // State management
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Menu[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<string>("home");
  const [selectedWaiter, setSelectedWaiter] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch items when category changes
  useEffect(() => {
    if (selectedCategory) {
      fetchItems(selectedCategory);
    }
  }, [selectedCategory]);

  /**
   * Fetch categories from API
   */
  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      setError(null);
      const data = await getCategories();
      setCategories(data);
      // Auto-select first category if available
      if (data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0].id);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof CategoryApiError
          ? err.message
          : "Failed to load categories. Please try again later.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  /**
   * Fetch items from API filtered by category
   */
  const fetchItems = async (categoryId: string) => {
    try {
      setIsLoadingItems(true);
      setError(null);
      // Fetch all items for the category (no pagination for cashier view)
      const response = await getItems(categoryId, { page: 1, limit: 1000 });
      // Filter only available items
      const availableItems = response.data.filter((item) => item.available);
      setItems(availableItems);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof ItemApiError
          ? err.message
          : "Failed to load menu items. Please try again later.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const addToCart = (item: MenuItem): void => {
    // Validate item has an ID
    if (
      !item ||
      !item.id ||
      typeof item.id !== "string" ||
      item.id.trim() === ""
    ) {
      console.error("Item missing ID:", item);
      toast.error("Item is missing an ID. Please refresh the page.");
      return;
    }

    setCart((prevCart) => {
      // Create a new array to ensure React detects the change
      const newCart = [...prevCart];

      // Find if this exact item already exists in cart by ID
      const existingItemIndex = newCart.findIndex(
        (cartItem) => cartItem.id === item.id
      );

      if (existingItemIndex !== -1) {
        // Item exists - increase quantity (create new object to trigger re-render)
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + 1,
        };
      } else {
        // New item - add to cart with a new object
        newCart.push({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        });
      }

      return newCart;
    });
  };

  const updateQuantity = (id: string, delta: number): void => {
    setCart((prevCart) => {
      return prevCart
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (id: string): void => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const clearCart = (): void => {
    setCart([]);
    toast.info("Cart cleared");
  };

  const calculateTotal = (): number => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  /**
   * Handle processing payment and creating order
   * Creates order in backend when payment is processed
   */
  const handleProcessPayment = async (): Promise<void> => {
    // Validate inputs
    if (cart.length === 0) {
      toast.error("Please add items to cart");
      return;
    }
    if (!orderType) {
      toast.error("Please select order type");
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
      setIsProcessingOrder(true);

      // Get full menu items to access category information for typeSnapshot
      const orderItems: CreateOrderInput["items"] = cart.map((cartItem) => {
        const fullItem = items.find((item) => item.id === cartItem.id);
        // Determine if item is food or beverage based on category
        // You can customize this logic based on your category names
        const categoryName =
          categories
            .find((c) => c.id === fullItem?.category)
            ?.name.toLowerCase() || "";
        const isBeverage =
          categoryName.includes("drink") ||
          categoryName.includes("beverage") ||
          categoryName.includes("juice");

        return {
          itemId: cartItem.id,
          typeSnapshot: isBeverage ? ("beverage" as const) : ("food" as const),
          qty: cartItem.quantity,
          nameSnapshot: cartItem.name,
          priceSnapshot: cartItem.price,
        };
      });

      // Extract table number from "Table X" format
      const tableNumber = selectedTable.replace("Table ", "").trim();

      // Create order in backend
      const order = await createOrder({
        tableNumber,
        items: orderItems,
        waiterId: selectedWaiter, // Note: This should be waiter ID, not name
        note: orderType === "delivery" ? "Delivery order" : undefined,
      });

      // Success - clear cart and reset form
      toast.success(
        `Order created successfully! Order #${
          order.orderNumber
        }. Total: $${calculateTotal().toFixed(2)}`
      );
      setCart([]);
      setOrderType("home");
      setSelectedWaiter("");
      setSelectedTable("");
    } catch (err: unknown) {
      // Handle different error types
      if (err instanceof OrderApiError) {
        if (err.status === 400) {
          toast.error(
            err.message || "Invalid order data. Please check your selections."
          );
        } else if (err.status === 0) {
          toast.error("Network error: Could not connect to the server");
        } else {
          toast.error(err.message || "Failed to create order");
        }
      } else {
        toast.error("An unexpected error occurred while creating the order");
      }
    } finally {
      setIsProcessingOrder(false);
    }
  };

  /**
   * Convert Menu items to MenuItem format for cart
   */
  const menuToMenuItem = (menu: Menu): MenuItem => {
    return {
      id: menu.id,
      name: menu.name,
      price: menu.price,
    };
  };

  // Get current items for selected category (already filtered by API)
  // Filter out any items without IDs to prevent errors
  const currentItems = items
    .filter(
      (menu) =>
        menu && menu.id && typeof menu.id === "string" && menu.id.trim() !== ""
    )
    .map(menuToMenuItem);

  return (
    <div className="space-y-4 lg:space-y-6 flex flex-col h-full min-h-0">
      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchCategories();
              if (selectedCategory) {
                fetchItems(selectedCategory);
              }
            }}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Categories - Mobile: Horizontal Scroll, Desktop: Grid */}
      <div className="mb-4 lg:mb-6">
        {isLoadingCategories ? (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading categories...</span>
          </div>
        ) : (
          <div className="flex gap-2 lg:gap-3 overflow-x-auto pb-2 lg:pb-0 lg:flex-wrap scrollbar-hide -mx-1 px-1">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`shrink-0 rounded-lg px-4 py-2.5 lg:px-6 lg:py-3 text-sm lg:text-base font-medium transition-colors min-h-[44px] ${
                  selectedCategory === category.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content - Mobile: Stack, Desktop: Split */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
        {/* Items Display - Left Side */}
        <div className="flex-1 flex flex-col min-h-0">
          <Card className="p-4 lg:p-6 shadow-md flex flex-col flex-1 min-h-0">
            <h2 className="mb-4 text-lg lg:text-xl font-semibold text-gray-900 shrink-0">
              {categories.find((c) => c.id === selectedCategory)?.name ||
                "Select Category"}
            </h2>
            {isLoadingItems ? (
              <div className="flex items-center justify-center py-12 flex-1">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">
                  Loading menu items...
                </span>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <p className="text-gray-500 text-center">
                  {selectedCategory
                    ? "No available items in this category"
                    : "Please select a category"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto pr-2 min-h-0">
                {currentItems.map((item) => {
                  // Find this specific item in cart by ID
                  const cartItem = cart.find((ci) => ci.id === item.id);
                  const quantity = cartItem?.quantity || 0;

                  return (
                    <div
                      key={`item-${item.id}`}
                      onClick={() => addToCart(item)}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 lg:p-4 shadow-sm transition-shadow hover:shadow-md cursor-pointer min-h-[60px] relative"
                    >
                      {quantity > 0 && (
                        <span className="absolute top-2 right-2 text-red-500 font-bold text-lg">
                          {quantity}
                        </span>
                      )}
                      <div className="flex-1">
                        <h3 className="text-sm lg:text-base font-medium text-gray-900">
                          {item.name}
                        </h3>
                        <p className="text-primary font-semibold text-sm lg:text-base">
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item);
                        }}
                        size="sm"
                        className="min-h-[44px] min-w-[44px]"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        <span className="hidden sm:inline">Add</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Cart Summary - Right Side / Bottom on Mobile */}
        <div className="w-full lg:w-96 lg:flex-shrink-0">
          <Card className="border-2 border-gray-200 shadow-xl">
            <div className="border-b border-gray-200 bg-primary p-4 text-primary-foreground">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearCart}
                    className="h-8 w-8 text-primary-foreground hover:text-red-300 hover:bg-primary-foreground/20"
                    aria-label="Clear all items"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="text-sm text-primary-foreground/90">
                Total Items:{" "}
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
            </div>

            {/* Order Type, Waiter and Table Assignment */}
            <div className="border-b border-gray-200 bg-gray-50 p-3 flex flex-col sm:flex-row gap-3">
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger className="w-full sm:flex-1 min-h-[44px]">
                  <SelectValue placeholder="Order type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Dine In</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedWaiter} onValueChange={setSelectedWaiter}>
                <SelectTrigger className="w-full sm:flex-1 min-h-[44px]">
                  <SelectValue placeholder="Select waiter" />
                </SelectTrigger>
                <SelectContent>
                  {waiters.map((waiter) => (
                    <SelectItem key={waiter} value={waiter}>
                      {waiter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger className="w-full sm:flex-1 min-h-[44px]">
                  <SelectValue placeholder="Choose table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-[420px] lg:max-h-[500px] overflow-y-auto p-4">
              {cart.length === 0 ? (
                <p className="py-8 text-center text-gray-500">
                  No items in cart
                </p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 border-b border-gray-100 py-2 last:border-b-0"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm lg:text-base font-medium text-gray-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs lg:text-sm text-gray-600">
                          ${item.price.toFixed(2)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 lg:h-8 lg:w-8"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Badge
                          variant="secondary"
                          className="px-3 min-w-[44px] justify-center"
                        >
                          {item.quantity}
                        </Badge>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 lg:h-8 lg:w-8"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 lg:h-8 lg:w-8 text-red-500 hover:text-red-700"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 bg-gray-50 p-4 sticky bottom-0">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-base font-medium text-gray-700">
                  Total:
                </span>
                <span className="text-lg font-bold text-gray-900">
                  ${calculateTotal().toFixed(2)}
                </span>
              </div>
              <Button
                className="w-full min-h-[44px]"
                size="lg"
                disabled={
                  cart.length === 0 ||
                  !orderType ||
                  !selectedWaiter ||
                  !selectedTable ||
                  isProcessingOrder
                }
                onClick={handleProcessPayment}
              >
                {isProcessingOrder ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Process Payment"
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
