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
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CartItem, MenuItem } from "@/lib/types";
import { getMenusByCategory, initialMenus, type Menu } from "@/lib/menu-store";

interface Category {
  id: string;
  name: string;
}

const categories: Category[] = [
  { id: "appetizers", name: "Appetizers" },
  { id: "main-courses", name: "Main Courses" },
  { id: "drinks", name: "Drinks" },
  { id: "desserts", name: "Desserts" },
];

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
  const [selectedCategory, setSelectedCategory] =
    useState<string>("appetizers");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<string>("home");
  const [selectedWaiter, setSelectedWaiter] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [menus, setMenus] = useState<Menu[]>([]);

  // Load menus from shared store
  useEffect(() => {
    // Initialize from localStorage if available, otherwise use seed data
    if (typeof window !== "undefined") {
      const storedMenus = localStorage.getItem("restaurant-menus");
      if (storedMenus) {
        try {
          const parsedMenus = JSON.parse(storedMenus);
          setMenus(parsedMenus);
        } catch (error) {
          // If parse fails, use initial menus
          setMenus(initialMenus);
          localStorage.setItem(
            "restaurant-menus",
            JSON.stringify(initialMenus)
          );
        }
      } else {
        // First time - initialize with seed data
        setMenus(initialMenus);
        localStorage.setItem("restaurant-menus", JSON.stringify(initialMenus));
      }

      // Listen for menu updates from MenuManagement
      const handleStorageChange = () => {
        const updatedMenus = localStorage.getItem("restaurant-menus");
        if (updatedMenus) {
          try {
            setMenus(JSON.parse(updatedMenus));
          } catch (error) {
            console.error("Error parsing menus from storage:", error);
          }
        }
      };

      window.addEventListener("storage", handleStorageChange);
      // Also listen for custom event for same-window updates
      window.addEventListener("menus-updated", handleStorageChange);

      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("menus-updated", handleStorageChange);
      };
    }
  }, []);

  const addToCart = (item: MenuItem): void => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
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

  const handleProcessPayment = (): void => {
    if (cart.length === 0 || !orderType || !selectedWaiter || !selectedTable) {
      toast.error(
        "Please select order type, waiter, and table, and add items to cart"
      );
      return;
    }
    toast.success(
      `Payment processed successfully! Total: $${calculateTotal().toFixed(2)}`
    );
    setCart([]);
    setOrderType("home");
    setSelectedWaiter("");
    setSelectedTable("");
  };

  // Get available menu items for selected category
  const currentItems = getMenusByCategory(menus, selectedCategory);

  return (
    <div className="space-y-4 lg:space-y-6 flex flex-col h-full min-h-0">
      {/* Categories - Mobile: Horizontal Scroll, Desktop: Grid */}
      <div className="mb-4 lg:mb-6">
        <div className="flex gap-2 lg:gap-3 overflow-x-auto pb-2 lg:pb-0 lg:flex-wrap scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex-shrink-0 rounded-lg px-4 py-2.5 lg:px-6 lg:py-3 text-sm lg:text-base font-medium transition-colors min-h-[44px] ${
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Mobile: Stack, Desktop: Split */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
        {/* Items Display - Left Side */}
        <div className="flex-1 flex flex-col min-h-0">
          <Card className="p-4 lg:p-6 shadow-md flex flex-col flex-1 min-h-0">
            <h2 className="mb-4 text-lg lg:text-xl font-semibold text-gray-900 flex-shrink-0">
              {categories.find((c) => c.id === selectedCategory)?.name}
            </h2>
            <div className="space-y-2 flex-1 overflow-y-auto pr-2 min-h-0">
              {currentItems.map((item) => {
                const cartItem = cart.find((ci) => ci.id === item.id);
                const quantity = cartItem?.quantity || 0;
                return (
                  <div
                    key={item.id}
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
                  !selectedTable
                }
                onClick={handleProcessPayment}
              >
                Process Payment
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
