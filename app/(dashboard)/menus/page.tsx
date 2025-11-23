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
  useListItemsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useUpdateItemAvailabilityMutation,
} from "@/stores/features/items/itemsApi";
import { useListCategoriesQuery } from "@/stores/features/categories/categoriesApi";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";

interface MenuFormData {
  categoryId: string;
  name: string;
  price: string;
  description: string;
  available: string;
}

export default function MenuManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [formData, setFormData] = useState<MenuFormData>({
    categoryId: "",
    name: "",
    price: "",
    description: "",
    available: "true",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Redux Toolkit hooks
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useListCategoriesQuery();

  const {
    data: items = [],
    isLoading: isLoadingItems,
    error: itemsError,
    refetch: refetchItems,
  } = useListItemsQuery({
    categoryId:
      selectedCategoryFilter === "all" ? undefined : selectedCategoryFilter,
    includeUnavailable: true,
  });

  const [createItem, { isLoading: isCreating }] = useCreateItemMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdateItemMutation();
  const [deleteItem] = useDeleteItemMutation();
  const [updateAvailability] = useUpdateItemAvailabilityMutation();

  const isSubmitting = isCreating || isUpdating;
  const isLoading = isLoadingItems || isLoadingCategories;
  const error =
    itemsError && "data" in itemsError
      ? (itemsError.data as { message?: string })?.message ||
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
      return category?.name || categoryId;
    },
    [categories]
  );

  // Client-side filtering for search and availability
  const filteredItems = useMemo(() => {
    return items.filter(
      (item: {
        name: string;
        description?: string;
        category: string;
        available: boolean;
      }) => {
        // Search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchesName = item.name.toLowerCase().includes(query);
          const matchesDescription =
            item.description?.toLowerCase().includes(query) || false;
          const matchesCategory = getCategoryName(item.category)
            .toLowerCase()
            .includes(query);
          if (!matchesName && !matchesDescription && !matchesCategory) {
            return false;
          }
        }

        // Availability filter
        if (availabilityFilter === "available" && !item.available) {
          return false;
        }
        if (availabilityFilter === "unavailable" && item.available) {
          return false;
        }

        return true;
      }
    );
  }, [items, searchQuery, availabilityFilter, getCategoryName]);

  const handleCategoryFilterChange = (categoryId: string) => {
    setSelectedCategoryFilter(categoryId);
  };

  const handleAvailabilityFilterChange = (availability: string) => {
    setAvailabilityFilter(availability);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleCreate = async () => {
    if (!formData.categoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!formData.name?.trim()) {
      toast.error("Please enter an item name");
      return;
    }
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      await createItem({
        categoryId: formData.categoryId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price,
        isAvailable: formData.available === "true",
        image: imageFile || undefined,
      }).unwrap();

      resetForm();
      setIsCreateOpen(false);
      toast.success("Menu item created successfully");
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      const message =
        error?.data?.message || error?.message || "Failed to create menu item";
      toast.error(message);
    }
  };

  const handleEdit = (id: string) => {
    const menu = items.find((m: { id: string }) => m.id === id);
    if (menu) {
      setEditingMenuId(id);
      setFormData({
        categoryId: menu.category,
        name: menu.name,
        price: menu.price.toString(),
        description: menu.description,
        available: menu.available ? "true" : "false",
      });
      setImagePreview(menu.imageUrl || null);
      setIsEditOpen(true);
    }
  };

  const handleUpdate = async () => {
    if (!editingMenuId) {
      toast.error("No item selected for editing");
      return;
    }
    if (!formData.categoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!formData.name?.trim()) {
      toast.error("Please enter an item name");
      return;
    }
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      await updateItem({
        id: editingMenuId,
        data: {
          categoryId: formData.categoryId,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          price,
          isAvailable: formData.available === "true",
          image: imageFile || undefined,
        },
      }).unwrap();

      resetForm();
      setEditingMenuId(null);
      setIsEditOpen(false);
      toast.success("Menu item updated successfully");
    } catch (err: unknown) {
      const error = err as {
        data?: { message?: string };
        message?: string;
        status?: number;
      };
      const message =
        error?.data?.message || error?.message || "Failed to update menu item";
      if (error?.status === 404) {
        toast.error("Item not found. It may have been deleted.");
        refetchItems();
      } else {
        toast.error(message);
      }
    }
  };

  const handleCloseEdit = () => {
    resetForm();
    setEditingMenuId(null);
    setIsEditOpen(false);
  };

  const handleDelete = async (id: string) => {
    const menu = items.find((m: { id: string; name?: string }) => m.id === id);
    const menuName = menu?.name || "this item";

    try {
      await deleteItem(id).unwrap();
      toast.success(`Menu "${menuName}" deleted successfully`);
    } catch (err: unknown) {
      const error = err as {
        data?: { message?: string };
        message?: string;
        status?: number;
      };
      const message =
        error?.data?.message || error?.message || "Failed to delete menu item";
      if (error?.status === 404) {
        toast.error("Item not found. It may have already been deleted.");
        refetchItems();
      } else {
        toast.error(message);
      }
    }
  };

  const toggleAvailability = async (id: string) => {
    const menu = items.find(
      (m: { id: string; name?: string; available?: boolean }) => m.id === id
    );
    if (!menu) return;

    const newAvailability = !menu.available;

    try {
      await updateAvailability({
        id,
        data: { isAvailable: newAvailability },
      }).unwrap();
      toast.success(
        `Item "${menu.name}" marked as ${
          newAvailability ? "available" : "unavailable"
        }`
      );
    } catch (err: unknown) {
      const error = err as {
        data?: { message?: string };
        message?: string;
        status?: number;
      };
      const message =
        error?.data?.message ||
        error?.message ||
        "Failed to update availability";
      if (error?.status === 404) {
        toast.error("Item not found. It may have been deleted.");
        refetchItems();
      } else {
        toast.error(message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      categoryId: "",
      name: "",
      price: "",
      description: "",
      available: "true",
    });
    clearImage();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
          Menu
        </h1>
        <Button
          onClick={() => setIsCreateOpen(true)}
          disabled={isLoading}
          className={cn(isLoading ? "spin-in" : "")}
        >
          Create Menu
        </Button>
      </header>

      {error && !isLoading && (
        <ErrorState
          message={error}
          onRetry={() => {
            refetchItems();
          }}
        />
      )}

      {/* Search and Filters Container - Similar to OrderHistory */}
      {!isLoadingItems && !error && (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-2 rounded-full border bg-white dark:bg-slate-800">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by name, description, or category..."
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
              value={availabilityFilter}
              onValueChange={handleAvailabilityFilterChange}
            >
              <SelectTrigger className="w-fit rounded-full shrink-0 space-x-2">
                <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {isLoadingItems && <LoadingState message="Loading menu items..." />}

      {!isLoadingItems && !error && filteredItems.length === 0 && (
        <EmptyState
          message={
            searchQuery ||
            selectedCategoryFilter !== "all" ||
            availabilityFilter !== "all"
              ? "No menu items match your filters."
              : "No menu items found."
          }
          actionLabel="Create Your First Menu Item"
          onAction={() => setIsCreateOpen(true)}
        />
      )}

      {/* Mobile Card View */}
      {!isLoadingItems && !error && filteredItems.length > 0 && (
        <div className="lg:hidden space-y-4">
          {filteredItems.map(
            (menu: {
              id: string;
              name: string;
              category: string;
              description?: string;
              price: number;
              available: boolean;
              updatedAt?: string;
              imageUrl?: string;
            }) => (
              <div
                key={menu.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {menu.name}
                    </h3>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Category: {getCategoryName(menu.category)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      {menu.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handleEdit(menu.id)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <DeleteConfirmDialog
                      title="Are you sure?"
                      description="This action cannot be undone. This will permanently delete the menu"
                      itemName={menu.name}
                      onConfirm={() => handleDelete(menu.id)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {menu.price.toFixed(2)} ብር
                    </span>
                    <span
                      className={cn(
                        "ml-2 text-xs px-2 py-1 rounded",
                        menu.available
                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      )}
                    >
                      {menu.available ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAvailability(menu.id)}
                    className="min-h-[44px]"
                  >
                    {menu.available ? "Mark Unavailable" : "Mark Available"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Updated: {menu.updatedAt}
                </p>
              </div>
            )
          )}
        </div>
      )}

      {/* Desktop Table View */}
      {!isLoadingItems && !error && filteredItems.length > 0 && (
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
                  <TableHead className="w-auto min-w-[80px] pl-1 pr-1 py-2">
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
                {filteredItems.map(
                  (menu: {
                    id: string;
                    name: string;
                    category: string;
                    description?: string;
                    price: number;
                    available: boolean;
                    updatedAt?: string;
                    imageUrl?: string;
                  }) => (
                    <TableRow
                      key={menu.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      <TableCell className="font-medium py-1.5 pl-3 pr-0">
                        {menu.name}
                      </TableCell>
                      <TableCell className="py-1.5 pl-1 pr-1">
                        {getCategoryName(menu.category)}
                      </TableCell>
                      <TableCell className="py-1.5 pl-1 pr-2">
                        {menu.price.toFixed(2)} ብር
                      </TableCell>
                      <TableCell className="py-1.5 pl-1 pr-1">
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded",
                            menu.available
                              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          )}
                        >
                          {menu.available ? "Available" : "Unavailable"}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5 pl-1">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(menu.id)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <DeleteConfirmDialog
                            title="Are you sure?"
                            description="This action cannot be undone. This will permanently delete the menu"
                            itemName={menu.name}
                            onConfirm={() => handleDelete(menu.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create Menu Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>Create Menu</DialogTitle>
          </DialogHeader>
          <MenuForm
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            isLoadingCategories={isLoadingCategories}
            imagePreview={imagePreview}
            onImageChange={handleImageChange}
            onClearImage={clearImage}
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
                "Create Menu"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Menu Modal */}
      <Dialog open={isEditOpen} onOpenChange={handleCloseEdit}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>Edit Menu</DialogTitle>
          </DialogHeader>
          <MenuForm
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            isLoadingCategories={isLoadingCategories}
            imagePreview={imagePreview}
            onImageChange={handleImageChange}
            onClearImage={clearImage}
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
                "Update Menu"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Extracted form component to reduce duplication
interface MenuFormProps {
  formData: MenuFormData;
  setFormData: React.Dispatch<React.SetStateAction<MenuFormData>>;
  categories: Array<{ id: string; name: string }>;
  isLoadingCategories: boolean;
  imagePreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
}

function MenuForm({
  formData,
  setFormData,
  categories,
  isLoadingCategories,
  imagePreview,
  onImageChange,
  onClearImage,
}: MenuFormProps) {
  return (
    <div className="space-y-4 py-4">
      <div>
        <Label htmlFor="menu-category">Select Category</Label>
        <Select
          value={formData.categoryId}
          onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
          disabled={isLoadingCategories}
        >
          <SelectTrigger className="mt-2 min-h-[44px]">
            <SelectValue
              placeholder={
                isLoadingCategories
                  ? "Loading categories..."
                  : "Select category"
              }
            />
          </SelectTrigger>
          <SelectContent>
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
        <Label htmlFor="menu-name">Item Name</Label>
        <Input
          id="menu-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter item name"
          className="mt-2 min-h-[44px]"
        />
      </div>
      <div>
        <Label htmlFor="menu-price">Price</Label>
        <Input
          id="menu-price"
          type="number"
          step="0.01"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          placeholder="Enter price"
          className="mt-2 min-h-[44px]"
        />
      </div>
      <div>
        <Label htmlFor="menu-description">Description</Label>
        <Input
          id="menu-description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Enter description"
          className="mt-2 min-h-[44px]"
        />
      </div>
      <div>
        <Label htmlFor="menu-available">Availability</Label>
        <Select
          value={formData.available}
          onValueChange={(val) => setFormData({ ...formData, available: val })}
        >
          <SelectTrigger className="mt-2 min-h-[44px]">
            <SelectValue placeholder="Select availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Available</SelectItem>
            <SelectItem value="false">Unavailable</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="menu-image">Image (Optional)</Label>
        <Input
          id="menu-image"
          type="file"
          accept="image/*"
          onChange={onImageChange}
          className="mt-2 min-h-[44px]"
        />
        {imagePreview && (
          <div className="mt-2 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-slate-700"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onClearImage}
              className="absolute top-2 right-2"
            >
              Remove
            </Button>
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
        </p>
      </div>
    </div>
  );
}
