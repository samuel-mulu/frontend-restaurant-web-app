"use client";

import React from "react";
import { Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/api/config";

type Item = {
  id: number;
  title: string;
  description: string;
  price: number;
};

const items: Item[] = [
  {
    id: 1,
    title: "Da Hong Pao Milk Tea",
    description:
      "Da Hong Pao Milk Tea from our Freshly Brewed Milk Tea Series. Served in a cup.",
    price: 12,
  },
  {
    id: 2,
    title: "Oolong Milk Tea",
    description:
      "Oolong Milk Tea from our Freshly Brewed Milk Tea Series. Served in a cup.",
    price: 12,
  },
  {
    id: 3,
    title: "Chocolate Milk Tea",
    description:
      "Chocolate Milk Tea from our Freshly Brewed Milk Tea Series. Served in a cup.",
    price: 15,
  },
];

type CartItem = Item & { quantity: number };

type Waiter = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
};

type Table = {
  _id: string;
  tableNumber: string;
};

export default function PixelPerfectMenu() {
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [waiters, setWaiters] = React.useState<Waiter[]>([]);
  const [tables, setTables] = React.useState<Table[]>([]);
  const [selectedWaiter, setSelectedWaiter] = React.useState<string>("");
  const [selectedTable, setSelectedTable] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [waitersData, tablesData] = await Promise.all([
          apiRequest<{
            staff: Waiter[];
            pagination: {
              page: number;
              limit: number;
              total: number;
              pages: number;
            };
          }>("/staff?role=waiter&status=active"),
          apiRequest<{ data: Table[] }>("/tables"),
        ]);

        setWaiters(waitersData.staff || []);
        setTables(tablesData.data || tablesData || []);
      } catch (error) {
        console.error("Failed to fetch waiters or tables:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const addItem = (item: Item) => {
    setCart((c) => {
      const existingItem = c.find((i) => i.id === item.id);
      if (existingItem) {
        return c.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...c, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: number, delta: number) => {
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

  const removeItem = (itemId: number) => {
    setCart((c) => c.filter((i) => i.id !== itemId));
  };

  const totalItems = cart.reduce((acc, it) => acc + it.quantity, 0);
  const total = cart.reduce(
    (acc: number, it: CartItem) => acc + it.price * it.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-[#f6f8fa] ">
      <div className=" mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: menu */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-[#eef2f6]">
          {/* Tabs */}
          <div className="flex items-end gap-8 px-8 pt-6">
            <button className="text-[#e11d2f] font-semibold">
              classic series
            </button>
            <div className="flex-1 text-center">
              <h3 className="text-lg font-semibold text-[#163a5b]">
                Fresh Ice Cream
              </h3>
            </div>
            <div className="text-[#6b7b88]">Refreshing Fruit Tea Series</div>
          </div>

          {/* Items list */}
          <div className="divide-y divide-[#eef2f6]">
            {items.map((item) => (
              <div key={item.id} className="px-8 py-6 flex items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-[#0b3b66] text-lg font-bold leading-tight">
                        {item.title}
                      </h4>
                      <div className="text-[#e11d2f] font-semibold text-sm">
                        Br {item.price}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-4">
                      <Button
                        onClick={() => addItem(item)}
                        size={"sm"}
                        className="px-6 w-full rounded-full bg-[#0b3b66] text-white shadow-lg shadow-[#0b3b66]/30 hover:bg-[#092c58]"
                        aria-label={`Add ${item.title}`}
                      >
                        Add Item
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
                  {waiters.map((waiter) => (
                    <SelectItem key={waiter._id} value={waiter._id}>
                      {waiter.name}
                    </SelectItem>
                  ))}
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
                  {tables.map((table) => (
                    <SelectItem key={table._id} value={table._id}>
                      Table {table.tableNumber}
                    </SelectItem>
                  ))}
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
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex flex-col">
                  <h4 className="text-[#0b3b66] font-semibold text-sm leading-tight">
                    {item.title}
                  </h4>
                  <p>{item.price} ብር</p>
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
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {cart.length === 0 && (
            <div className="text-[#6b7b88] text-sm text-center py-8">
              Your cart is empty
            </div>
          )}

          <hr className="my-4 border-t border-[#eef2f6]" />

          <button className="mt-2 flex items-center gap-2 text-[#6b7b88] font-medium hover:text-[#0b3b66] transition">
            <Plus size={16} /> Add Note
          </button>

          <Button
            size={"sm"}
            className="mt-4 w-full rounded-full bg-[#0b3b66] text-white shadow-lg shadow-[#0b3b66]/30 hover:bg-[#092c58]"
          >
            Create Order
          </Button>
        </aside>
      </div>
    </div>
  );
}
