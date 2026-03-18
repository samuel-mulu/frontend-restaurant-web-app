"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Edit2,
  Filter,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useListCategoriesQuery } from "@/stores/features/categories/categoriesApi";
import {
  useCreateItemMutation,
  useDeleteItemMutation,
  useListItemsQuery,
  useUpdateItemAvailabilityMutation,
  useUpdateItemMutation,
} from "@/stores/features/items/itemsApi";

interface MenuFormData {
  categoryId: string;
  name: string;
  price: string;
  description: string;
  available: string;
  ingredients: string[];
  mealType: string;
  special: boolean;
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
    ingredients: [],
    mealType: "",
    special: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // Comment modal state
  const [commentModalItem, setCommentModalItem] = useState<{
    name: string;
    comments: string[];
  } | null>(null);

  const MENUS_QUERY_OPTIONS = {
    refetchOnMountOrArgChange: false,
  } as const;

  // Redux Toolkit hooks
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useListCategoriesQuery(undefined, MENUS_QUERY_OPTIONS);

  const {
    data: items = [],
    isLoading: isLoadingItems,
    error: itemsError,
    refetch: refetchItems,
  } = useListItemsQuery(
    {
      categoryId:
        selectedCategoryFilter === "all" ? undefined : selectedCategoryFilter,
      includeUnavailable: true,
    },
    MENUS_QUERY_OPTIONS
  );

  const [createItem, { isLoading: isCreating }] = useCreateItemMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdateItemMutation();
  const [deleteItem] = useDeleteItemMutation();
  const [updateAvailability, { isLoading: isUpdatingAvailability }] = useUpdateItemAvailabilityMutation();

  const isSubmitting = isCreating || isUpdating || isUpdatingAvailability;
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
        ingredients: formData.ingredients.length > 0 ? formData.ingredients : undefined,
        mealType: formData.mealType || undefined,
        special: formData.special || undefined,
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
        description: menu.description || "",
        available: menu.available ? "true" : "false",
        ingredients: menu.ingredients || [],
        mealType: menu.mealType || "",
        special: menu.special || false,
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
          ingredients: formData.ingredients.length > 0 ? formData.ingredients : undefined,
          mealType: formData.mealType || undefined,
          special: formData.special || undefined,
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
        `Item "${menu.name}" marked as ${newAvailability ? "available" : "unavailable"
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
      ingredients: [],
      mealType: "",
      special: false,
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
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            Menu
          </h1>
        </div>
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
              approvalStatus?: "pendingapproval" | "approved" | "rejected";
              updatedAt?: string;
              imageUrl?: string;
              ingredients?: string[];
              mealType?: "breakfast" | "lunch" | "dinner" | "treats";
              special?: boolean;
            }) => (
              <div
                key={menu.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {menu.name}
                      </h3>
                      {menu.special && (
                        <Badge variant="default" className="bg-amber-500 text-white">
                          ⭐ Special
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Category: {getCategoryName(menu.category)}
                    </p>
                    {menu.mealType && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Meal Type: <span className="capitalize">{menu.mealType}</span>
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      {menu.description}
                    </p>
                    {menu.ingredients && menu.ingredients.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Ingredients: {menu.ingredients.join(", ")}
                      </p>
                    )}
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
                      expectedPin="1219"
                      onConfirm={() => handleDelete(menu.id)}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
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
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-2 text-xs",
                        menu.approvalStatus === "pendingapproval" &&
                        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                        menu.approvalStatus === "approved" &&
                        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                        menu.approvalStatus === "rejected" &&
                        "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      )}
                    >
                      {menu.approvalStatus === "pendingapproval"
                        ? "Pending"
                        : menu.approvalStatus === "approved"
                          ? "Approved"
                          : menu.approvalStatus === "rejected"
                            ? "Rejected"
                            : "—"}
                    </Badge>
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
                  <TableHead className="w-auto min-w-[120px] pl-1 pr-1 py-2">
                    Meal Type
                  </TableHead>
                  <TableHead className="w-auto min-w-[100px] pl-1 pr-1 py-2">
                    Special
                  </TableHead>
                  <TableHead className="w-auto min-w-[150px] pl-1 pr-1 py-2">
                    Ingredients
                  </TableHead>
                  <TableHead className="w-auto min-w-[120px] pl-1 pr-1 py-2">
                    Comments
                  </TableHead>
                  <TableHead className="w-auto min-w-[100px] pl-1 pr-1 py-2">
                    Availability
                  </TableHead>
                  <TableHead className="w-auto min-w-[120px] pl-1 pr-1 py-2">
                    Approval
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
                    approvalStatus?: "pendingapproval" | "approved" | "rejected";
                    updatedAt?: string;
                    imageUrl?: string;
                    ingredients?: string[];
                    mealType?: "breakfast" | "lunch" | "dinner" | "treats";
                    special?: boolean;
                    comments?: string[];
                  }) => (
                    <TableRow
                      key={menu.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      <TableCell className="font-medium py-1.5 pl-3 pr-0">
                        <div className="flex items-center gap-2">
                          {menu.name}
                          {menu.special && (
                            <Badge variant="default" className="bg-amber-500 text-white text-xs">
                              ⭐
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5 pl-1 pr-1">
                        {getCategoryName(menu.category)}
                      </TableCell>
                      <TableCell className="py-1.5 pl-1 pr-2">
                        {menu.price.toFixed(2)} ብር
                      </TableCell>
                      <TableCell className="py-1.5 pl-1 pr-1">
                        {menu.mealType ? (
                          <Badge variant="outline" className="capitalize">
                            {menu.mealType}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 pl-1 pr-1">
                        {menu.special ? (
                          <Badge variant="default" className="bg-amber-500 text-white">
                            Special
                          </Badge>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 pl-1 pr-1">
                        {menu.ingredients && menu.ingredients.length > 0 ? (
                          <span
                            className="text-sm text-gray-600 dark:text-gray-400"
                            title={menu.ingredients.join(", ")}
                          >
                            {menu.ingredients.length > 2
                              ? `${menu.ingredients.slice(0, 2).join(", ")}...`
                              : menu.ingredients.join(", ")}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 pl-1 pr-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1 px-2 py-1"
                          onClick={() =>
                            setCommentModalItem({
                              name: menu.name,
                              comments: menu.comments || [],
                            })
                          }
                        >
                          <MessageCircle className="h-4 w-4 text-slate-500" />
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            {(menu.comments?.length ?? 0).toString()}
                          </span>
                        </Button>
                      </TableCell>
                      <TableCell className="py-1.5 pl-1 pr-1">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 rounded-lg border bg-white dark:bg-slate-800 p-0.5">
                            <Button
                              type="button"
                              variant={menu.available ? "default" : "ghost"}
                              size="sm"
                              onClick={() => toggleAvailability(menu.id)}
                              disabled={isSubmitting}
                              className={`h-7 px-3 text-xs ${menu.available
                                  ? "bg-green-600 hover:bg-green-700 text-white"
                                  : "text-gray-600 dark:text-gray-400"
                                }`}
                            >
                              Available
                            </Button>
                            <Button
                              type="button"
                              variant={!menu.available ? "default" : "ghost"}
                              size="sm"
                              onClick={() => toggleAvailability(menu.id)}
                              disabled={isSubmitting}
                              className={`h-7 px-3 text-xs ${!menu.available
                                  ? "bg-red-600 hover:bg-red-700 text-white"
                                  : "text-gray-600 dark:text-gray-400"
                                }`}
                            >
                              Unavailable
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5 pl-1 pr-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            menu.approvalStatus === "pendingapproval" &&
                            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                            menu.approvalStatus === "approved" &&
                            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                            menu.approvalStatus === "rejected" &&
                            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          )}
                        >
                          {menu.approvalStatus === "pendingapproval"
                            ? "Pending"
                            : menu.approvalStatus === "approved"
                              ? "Approved"
                              : menu.approvalStatus === "rejected"
                                ? "Rejected"
                                : "—"}
                        </Badge>
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
                            title="Delete Menu?"
                            description="This action cannot be undone. This will permanently delete the menu"
                            itemName={menu.name}
                            expectedPin="1219"
                            onConfirm={() => handleDelete(menu.id)}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
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

      {/* Comments Modal */}
      <Dialog
        open={!!commentModalItem}
        onOpenChange={(open) => {
          if (!open) setCommentModalItem(null);
        }}
      >
        <DialogContent className="max-w-md w-[95vw] max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>
              Comments{commentModalItem ? ` for ${commentModalItem.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            {commentModalItem && commentModalItem.comments.length > 0 ? (
              commentModalItem.comments.map((comment, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                >
                  {comment}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No comments for this item yet.
              </p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setCommentModalItem(null)}
              className="min-h-[40px]"
            >
              Close
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
          type="text"
          inputMode="decimal"
          value={formData.price}
          onChange={(e) => {
            const value = e.target.value;
            // Allow only numbers and one decimal point
            if (value === "" || /^\d*\.?\d*$/.test(value)) {
              setFormData({ ...formData, price: value });
            }
          }}
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
        <Label htmlFor="menu-ingredients">Ingredients (Optional)</Label>
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <Input
              id="menu-ingredients"
              placeholder="Enter ingredient"
              className="min-h-[44px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const input = e.currentTarget;
                  const value = input.value.trim();
                  if (value && !formData.ingredients.includes(value)) {
                    setFormData({
                      ...formData,
                      ingredients: [...formData.ingredients, value],
                    });
                    input.value = "";
                  }
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => {
                const input = document.getElementById(
                  "menu-ingredients"
                ) as HTMLInputElement;
                const value = input?.value.trim();
                if (value && !formData.ingredients.includes(value)) {
                  setFormData({
                    ...formData,
                    ingredients: [...formData.ingredients, value],
                  });
                  input.value = "";
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {formData.ingredients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.ingredients.map((ingredient, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 px-2 py-1"
                >
                  {ingredient}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        ingredients: formData.ingredients.filter(
                          (_, i) => i !== index
                        ),
                      });
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      <div>
        <Label htmlFor="menu-meal-type">Meal Type (Optional)</Label>
        <Select
          value={formData.mealType || undefined}
          onValueChange={(val) => setFormData({ ...formData, mealType: val })}
        >
          <SelectTrigger className="mt-2 min-h-[44px]">
            <SelectValue placeholder="Select meal type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="breakfast">Breakfast</SelectItem>
            <SelectItem value="lunch">Lunch</SelectItem>
            <SelectItem value="dinner">Dinner</SelectItem>
            <SelectItem value="treats">Treats</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="menu-special"
          checked={formData.special}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, special: checked === true })
          }
        />
        <Label
          htmlFor="menu-special"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          House Special
        </Label>
      </div>
      <div>
        <Label htmlFor="menu-available">Availability</Label>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-white dark:bg-slate-800 p-1">
            <Button
              type="button"
              variant={formData.available === "true" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFormData({ ...formData, available: "true" })}
              className={`h-9 px-4 text-sm ${formData.available === "true"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "text-gray-600 dark:text-gray-400"
                }`}
            >
              Available
            </Button>
            <Button
              type="button"
              variant={formData.available === "false" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFormData({ ...formData, available: "false" })}
              className={`h-9 px-4 text-sm ${formData.available === "false"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "text-gray-600 dark:text-gray-400"
                }`}
            >
              Unavailable
            </Button>
          </div>
        </div>
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
