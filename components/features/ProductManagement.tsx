"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Product } from "@/lib/types";

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Spring Rolls",
    category: "Appetizers",
    quantity: 50,
    unit: "pcs",
    price: 8.99,
    updatedAt: "2025-11-20",
  },
  {
    id: "2",
    name: "Grilled Salmon",
    category: "Main Courses",
    quantity: 30,
    unit: "pcs",
    price: 24.99,
    updatedAt: "2025-11-19",
  },
  {
    id: "3",
    name: "Coca Cola",
    category: "Drinks",
    quantity: 100,
    unit: "bottles",
    price: 3.5,
    updatedAt: "2025-11-20",
  },
  {
    id: "4",
    name: "Tiramisu",
    category: "Desserts",
    quantity: 20,
    unit: "slices",
    price: 8.99,
    updatedAt: "2025-11-18",
  },
];

const categories = ["Appetizers", "Main Courses", "Drinks", "Desserts"];

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    name: "",
    quantity: "",
    unit: "",
    price: "",
  });

  const handleCreate = () => {
    if (
      formData.category &&
      formData.name &&
      formData.quantity &&
      formData.unit &&
      formData.price
    ) {
      const newProduct: Product = {
        id: String(products.length + 1),
        name: formData.name,
        category: formData.category,
        quantity: parseInt(formData.quantity),
        unit: formData.unit,
        price: parseFloat(formData.price),
        updatedAt: new Date().toISOString().split("T")[0],
      };
      setProducts([...products, newProduct]);
      setFormData({
        category: "",
        name: "",
        quantity: "",
        unit: "",
        price: "",
      });
      setIsCreateOpen(false);
      toast.success("Product created successfully");
    } else {
      toast.error("Please fill in all fields");
    }
  };

  const handleDelete = (id: string) => {
    const product = products.find((p) => p.id === id);
    setProducts(products.filter((prod) => prod.id !== id));
    toast.success(`Product "${product?.name}" deleted successfully`);
  };

  const totalQuantity = products.reduce(
    (sum, product) => sum + product.quantity,
    0
  );
  const inventoryValue = products.reduce(
    (sum, product) => sum + product.quantity * product.price,
    0
  );
  const categoryCount = new Set(products.map((product) => product.category))
    .size;

  const summaryCards = [
    {
      label: "Products tracked",
      value: products.length,
      helper: "current catalog",
    },
    {
      label: "Categories",
      value: categoryCount,
      helper: "inventory groups",
    },
    {
      label: "Units on hand",
      value: totalQuantity,
      helper: "stocked quantity",
    },
    {
      label: "Inventory value",
      value: `${inventoryValue.toFixed(2)} ብር`,
      helper: "retail estimate",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="glass-panel p-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Inventory
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                Products
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Monitor stock levels, keep pricing aligned, and capture the
                essential data you need for procurement decisions.
              </p>
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="min-h-[44px] w-full rounded-full bg-slate-900 text-white shadow-lg sm:w-auto hover:bg-slate-800"
            >
              Create Product
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-inner shadow-slate-200/40"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-500">{stat.helper}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-600">{product.category}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete the product{" "}
                        <span className="font-semibold text-slate-900">
                          {product.name}
                        </span>
                        .
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(product.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Quantity:</span>
                <span className="ml-2 font-medium">
                  {product.quantity} {product.unit}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Price:</span>
                <span className="ml-2 font-medium">
                  {product.price.toFixed(2)} ብር
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Updated:</span>
                <span className="ml-2 font-medium">{product.updatedAt}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block soft-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>{product.quantity}</TableCell>
                <TableCell>{product.unit}</TableCell>
                <TableCell>{product.price.toFixed(2)} ብር</TableCell>
                <TableCell>{product.updatedAt}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the product{" "}
                            <span className="font-semibold text-slate-900">
                              {product.name}
                            </span>
                            .
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(product.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Product Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="category">Select Category</Label>
              <Select
                value={formData.category}
                onValueChange={(val) =>
                  setFormData({ ...formData, category: val })
                }
              >
                <SelectTrigger className="mt-2 min-h-[44px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter product name"
                className="mt-2 min-h-[44px]"
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="Enter quantity"
                className="mt-2 min-h-[44px]"
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                placeholder="e.g., pcs, bottles, kg"
                className="mt-2 min-h-[44px]"
              />
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                placeholder="Enter price"
                className="mt-2 min-h-[44px]"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="min-h-[44px] w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              className="min-h-[44px] w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
