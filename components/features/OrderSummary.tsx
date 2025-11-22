"use client";

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
import { ShoppingCart, Minus, Plus, Trash2, Loader2 } from "lucide-react";
import { CartItem } from "@/lib/types";

interface OrderSummaryProps {
  cart: CartItem[];
  orderType: string;
  selectedWaiter: string;
  selectedTable: string;
  isProcessingOrder: boolean;
  waiters: string[];
  tables: string[];
  onOrderTypeChange: (value: string) => void;
  onWaiterChange: (value: string) => void;
  onTableChange: (value: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveFromCart: (id: string) => void;
  onClearCart: () => void;
  onProcessPayment: () => void;
  calculateTotal: () => number;
}

export function OrderSummary({
  cart,
  orderType,
  selectedWaiter,
  selectedTable,
  isProcessingOrder,
  waiters,
  tables,
  onOrderTypeChange,
  onWaiterChange,
  onTableChange,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onProcessPayment,
  calculateTotal,
}: OrderSummaryProps) {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = calculateTotal();

  return (
    <div className="w-full lg:w-96 lg:shrink-0">
      <Card className="border-2 border-gray-200 shadow-xl">
        {/* Cart Header */}
        <div className="border-b border-gray-200 bg-primary p-4 text-primary-foreground">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
            </div>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearCart}
                className="h-8 w-8 text-primary-foreground hover:text-red-300 hover:bg-primary-foreground/20"
                aria-label="Clear all items"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="text-sm text-primary-foreground/90">
            Total Items: {totalItems}
          </div>
        </div>

        {/* Order Type, Waiter and Table Assignment */}
        <div className="border-b border-gray-200 bg-gray-50 p-3 flex flex-col sm:flex-row gap-3">
          <Select value={orderType} onValueChange={onOrderTypeChange}>
            <SelectTrigger className="w-full sm:flex-1 min-h-[44px]">
              <SelectValue placeholder="Order type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">Dine In</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedWaiter} onValueChange={onWaiterChange}>
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

          <Select value={selectedTable} onValueChange={onTableChange}>
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

        {/* Cart Items List */}
        <div className="max-h-[420px] lg:max-h-[500px] overflow-y-auto p-4">
          {cart.length === 0 ? (
            <p className="py-8 text-center text-gray-500">No items in cart</p>
          ) : (
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div
                  key={`cart-${item.id}-${index}`}
                  className="flex items-center gap-3 border-b border-gray-100 py-2 last:border-b-0"
                >
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
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
                      onClick={() => onUpdateQuantity(item.id, -1)}
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
                      onClick={() => onUpdateQuantity(item.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 lg:h-8 lg:w-8 text-red-500 hover:text-red-700"
                      onClick={() => onRemoveFromCart(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total and Process Payment */}
        <div className="border-t border-gray-200 bg-gray-50 p-4 sticky bottom-0">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-base font-medium text-gray-700">Total:</span>
            <span className="text-lg font-bold text-gray-900">
              ${total.toFixed(2)}
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
            onClick={onProcessPayment}
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
  );
}

