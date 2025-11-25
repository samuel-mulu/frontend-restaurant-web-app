"use client";

import { useState, useMemo, useCallback } from "react";
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
import { Edit2, Loader2, Search, X, Filter } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  useListInventoryQuery,
  useCreateInventoryMutation,
  useUpdateInventoryMutation,
} from "@/stores/features/inventory/inventoryApi";
import { useListCategoriesQuery } from "@/stores/features/categories/categoriesApi";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Inventory } from "@/lib/types";

interface InventoryFormData {
  categoryId: string;
  name: string;
  description: string;
  quantity: string;
  unit: string;
  price: string;
}

export function InventoryManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(
    null
  );
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("all");
  const [lowStockFilter, setLowStockFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [formData, setFormData] = useState<InventoryFormData>({
    categoryId: "",
    name: "",
    description: "",
    quantity: "",
    unit: "",
    price: "",
  });

  // Redux Toolkit hooks
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useListCategoriesQuery();

  const {
    data: inventoryItems = [],
    isLoading: isLoadingInventory,
    error: inventoryError,
    refetch: refetchInventory,
  } = useListInventoryQuery({
    categoryId:
      selectedCategoryFilter === "all" ? undefined : selectedCategoryFilter,
  });

  const [createInventory, { isLoading: isCreating }] =
    useCreateInventoryMutation();
  const [updateInventory, { isLoading: isUpdating }] =
    useUpdateInventoryMutation();

  const isSubmitting = isCreating || isUpdating;
  const isLoading = isLoadingInventory || isLoadingCategories;
  const error =
    inventoryError && "data" in inventoryError
      ? (inventoryError.data as { message?: string })?.message ||
        "An error occurred"
      : categoriesError && "data" in categoriesError
      ? (categoriesError.data as { message?: string })?.message ||
        "An error occurred"
      : null;

  const getCategoryName = useCallback(
    (categoryId: string): string => {
      const category = categories.find(
        (cat: { id: string; name: string }) => cat.id === categoryId
      );
      return category?.name || categoryId || "Uncategorized";
    },
    [categories]
  );

  // Client-side filtering for search and low stock
  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item: Inventory) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDescription =
          item.description?.toLowerCase().includes(query) || false;
        const matchesCategory = getCategoryName(item.category)
          .toLowerCase()
          .includes(query);
        const matchesUnit = item.unit.toLowerCase().includes(query);
        if (
          !matchesName &&
          !matchesDescription &&
          !matchesCategory &&
          !matchesUnit
        ) {
          return false;
        }
      }

      // Low stock filter
      if (lowStockFilter === "low" && !item.isLowStock) {
        return false;
      }
      if (lowStockFilter === "normal" && item.isLowStock) {
        return false;
      }

      return true;
    });
  }, [inventoryItems, searchQuery, lowStockFilter, getCategoryName]);

  const handleCategoryFilterChange = (categoryId: string) => {
    setSelectedCategoryFilter(categoryId);
  };

  const handleLowStockFilterChange = (filter: string) => {
    setLowStockFilter(filter);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleCreate = async () => {
    if (!formData.name?.trim()) {
      toast.error("Please enter an item name");
      return;
    }
    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity < 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (!formData.unit?.trim()) {
      toast.error("Please enter a unit");
      return;
    }
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      await createInventory({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        categoryId: formData.categoryId || undefined,
        quantity,
        unit: formData.unit.trim(),
        price,
      }).unwrap();

      resetForm();
      setIsCreateOpen(false);
      toast.success("Inventory item created successfully");
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      const message =
        error?.data?.message ||
        error?.message ||
        "Failed to create inventory item";
      toast.error(message);
    }
  };

  const handleEdit = (id: string) => {
    const item = inventoryItems.find((i: Inventory) => i.id === id);
    if (item) {
      setEditingInventoryId(id);
      setFormData({
        categoryId: item.category || "",
        name: item.name,
        description: item.description || "",
        quantity: item.quantity.toString(),
        unit: item.unit,
        price: item.price.toString(),
      });
      setIsEditOpen(true);
    }
  };

  const handleUpdate = async () => {
    if (!editingInventoryId) {
      toast.error("No item selected for editing");
      return;
    }
    if (!formData.name?.trim()) {
      toast.error("Please enter an item name");
      return;
    }
    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity < 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (!formData.unit?.trim()) {
      toast.error("Please enter a unit");
      return;
    }
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      await updateInventory({
        id: editingInventoryId,
        data: {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          categoryId: formData.categoryId || undefined,
          quantity,
          unit: formData.unit.trim(),
          price,
        },
      }).unwrap();

      resetForm();
      setEditingInventoryId(null);
      setIsEditOpen(false);
      toast.success("Inventory item updated successfully");
    } catch (err: unknown) {
      const error = err as {
        data?: { message?: string };
        message?: string;
        status?: number;
      };
      const message =
        error?.data?.message ||
        error?.message ||
        "Failed to update inventory item";
      if (error?.status === 404) {
        toast.error("Item not found. It may have been deleted.");
        refetchInventory();
      } else {
        toast.error(message);
      }
    }
  };

  const handleCloseEdit = () => {
    resetForm();
    setEditingInventoryId(null);
    setIsEditOpen(false);
  };

  // Note: Delete functionality is not yet implemented in the backend
  // const handleDelete = async (id: string) => {
  //   // Delete functionality can be added when backend supports it
  // };

  const resetForm = () => {
    setFormData({
      categoryId: "",
      name: "",
      description: "",
      quantity: "",
      unit: "",
      price: "",
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            Inventory
          </h1>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          disabled={isLoading}
          className={cn(isLoading ? "spin-in" : "")}
        >
          Create Inventory Item
        </Button>
      </header>

      {error && !isLoading && (
        <ErrorState
          message={error}
          onRetry={() => {
            refetchInventory();
          }}
        />
      )}

      {/* Search and Filters Container */}
      {!isLoadingInventory && !error && (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-2 rounded-full border bg-white dark:bg-slate-800">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by name, description, category, or unit..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-10 rounded-full"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 shrink-0">
            <Select
              value={selectedCategoryFilter}
              onValueChange={handleCategoryFilterChange}
            >
              <SelectTrigger className="w-fit rounded-full shrink-0 space-x-2">
                <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category: { id: string; name: string }) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={lowStockFilter}
              onValueChange={handleLowStockFilterChange}
            >
              <SelectTrigger className="w-fit rounded-full shrink-0 space-x-2">
                <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="normal">Normal Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {isLoadingInventory && (
        <LoadingState message="Loading inventory items..." />
      )}

      {!isLoadingInventory && !error && filteredItems.length === 0 && (
        <EmptyState
          message={
            searchQuery ||
            selectedCategoryFilter !== "all" ||
            lowStockFilter !== "all"
              ? "No inventory items match your filters."
              : "No inventory items found."
          }
          actionLabel="Create Your First Inventory Item"
          onAction={() => setIsCreateOpen(true)}
        />
      )}

      {/* Mobile Card View */}
      {!isLoadingInventory && !error && filteredItems.length > 0 && (
        <div className="lg:hidden space-y-4">
          {filteredItems.map((item: Inventory) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {item.name}
                  </h3>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category: {getCategoryName(item.category)}
                  </p>
                  {item.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      {item.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleEdit(item.id)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Quantity:
                  </span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                    {item.quantity} {item.unit}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Price:
                  </span>
                  <span className="ml-2 font-medium text-primary">
                    Br {item.price?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span
                    className={cn(
                      "text-xs px-2 py-1 rounded",
                      item.isLowStock
                        ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                        : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                    )}
                  >
                    {item.isLowStock ? "⚠ Low Stock" : "✓ In Stock"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    Updated:
                  </span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                    {item.updatedAt}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop Table View */}
      {!isLoadingInventory && !error && filteredItems.length > 0 && (
        <div className="hidden lg:flex flex-col flex-1 min-h-0 soft-card overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                <TableRow>
                  <TableHead className="w-auto min-w-[200px] pr-1 py-2">
                    Item Name
                  </TableHead>
                  <TableHead className="w-auto min-w-[150px] pl-1 pr-1 py-2">
                    Category
                  </TableHead>
                  <TableHead className="w-auto min-w-[120px] pl-1 pr-1 py-2">
                    Quantity
                  </TableHead>
                  <TableHead className="w-auto min-w-[100px] pl-1 pr-1 py-2">
                    Unit
                  </TableHead>
                  <TableHead className="w-auto min-w-[100px] pl-1 pr-1 py-2">
                    Price
                  </TableHead>
                  <TableHead className="w-auto min-w-[100px] pl-1 pr-1 py-2">
                    Status
                  </TableHead>
                  <TableHead className="w-auto min-w-[100px] pl-1 py-2">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: Inventory) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <TableCell className="font-medium py-1.5 pl-3 pr-0">
                      {item.name}
                    </TableCell>
                    <TableCell className="py-1.5 pl-1 pr-1">
                      {getCategoryName(item.category)}
                    </TableCell>
                    <TableCell className="py-1.5 pl-1 pr-2">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="py-1.5 pl-1 pr-1">
                      {item.unit}
                    </TableCell>
                    <TableCell className="py-1.5 pl-1 pr-1">
                      <span className="font-medium text-primary">
                        Br {item.price?.toFixed(2) || "0.00"}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 pl-1 pr-1">
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded",
                          item.isLowStock
                            ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                            : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                        )}
                      >
                        {item.isLowStock ? "⚠ Low Stock" : "✓ In Stock"}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 pl-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(item.id)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create Inventory Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>Create Inventory Item</DialogTitle>
          </DialogHeader>
          <InventoryForm
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            isLoadingCategories={isLoadingCategories}
          />
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                resetForm();
              }}
              className="min-h-[44px] w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || isLoadingCategories}
              className="min-h-[44px] w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Inventory Modal */}
      <Dialog open={isEditOpen} onOpenChange={handleCloseEdit}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
          </DialogHeader>
          <InventoryForm
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            isLoadingCategories={isLoadingCategories}
          />
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCloseEdit}
              className="min-h-[44px] w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isSubmitting || isLoadingCategories}
              className="min-h-[44px] w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Extracted form component to reduce duplication
interface InventoryFormProps {
  formData: InventoryFormData;
  setFormData: React.Dispatch<React.SetStateAction<InventoryFormData>>;
  categories: Array<{ id: string; name: string }>;
  isLoadingCategories: boolean;
}

function InventoryForm({
  formData,
  setFormData,
  categories,
  isLoadingCategories,
}: InventoryFormProps) {
  return (
    <div className="space-y-4 py-4">
      <div>
        <Label htmlFor="inventory-category">Category (Optional)</Label>
        <Select
          value={formData.categoryId || "none"}
          onValueChange={(val) =>
            setFormData({ ...formData, categoryId: val === "none" ? "" : val })
          }
          disabled={isLoadingCategories}
        >
          <SelectTrigger className="mt-2 min-h-[44px]">
            <SelectValue
              placeholder={
                isLoadingCategories
                  ? "Loading categories..."
                  : "Select category (optional)"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {categories.length === 0 && !isLoadingCategories ? (
              <SelectItem value="no-categories" disabled>
                No categories available
              </SelectItem>
            ) : (
              categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="inventory-name">Item Name *</Label>
        <Input
          id="inventory-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter item name"
          className="mt-2 min-h-[44px]"
          required
        />
      </div>
      <div>
        <Label htmlFor="inventory-description">Description (Optional)</Label>
        <Input
          id="inventory-description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Enter description"
          className="mt-2 min-h-[44px]"
        />
      </div>
      <div>
        <Label htmlFor="inventory-quantity">Quantity *</Label>
        <Input
          id="inventory-quantity"
          type="number"
          min="0"
          step="0.01"
          value={formData.quantity}
          onChange={(e) =>
            setFormData({ ...formData, quantity: e.target.value })
          }
          placeholder="Enter quantity"
          className="mt-2 min-h-[44px]"
          required
        />
      </div>
      <div>
        <Label htmlFor="inventory-unit">Unit *</Label>
        <Input
          id="inventory-unit"
          value={formData.unit}
          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          placeholder="e.g., kg, pcs, bottles, liters"
          className="mt-2 min-h-[44px]"
          required
        />
      </div>
      <div>
        <Label htmlFor="inventory-price">Price (Br) *</Label>
        <Input
          id="inventory-price"
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          placeholder="0.00"
          className="mt-2 min-h-[44px]"
          required
        />
      </div>
    </div>
  );
}
