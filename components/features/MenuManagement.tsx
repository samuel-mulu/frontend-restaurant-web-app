"use client";

import { useState, useEffect } from "react";
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
import {
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
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
import { type Menu } from "@/lib/menu-store";
import { Category } from "@/lib/types";
import { getCategories } from "@/lib/api/categories";
import {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  updateItemAvailability,
  ApiError,
  PaginatedResponse,
} from "@/lib/api/items";

interface MenuFormData {
  categoryId: string; // Changed from category to categoryId
  name: string;
  price: string;
  description: string;
  available: string;
}

export function MenuManagement() {
  // State management
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<MenuFormData>({
    categoryId: "",
    name: "",
    price: "",
    description: "",
    available: "true",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch items on mount and when category filter or page changes
  useEffect(() => {
    fetchItems();
  }, [selectedCategoryFilter, currentPage]);

  /**
   * Fetch categories from API for dropdown
   */
  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      setError(null);
      const data = await getCategories();
      setCategories(data);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : "Failed to load categories. Please try again later.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  /**
   * Fetch items from API with pagination
   * Optionally filtered by category
   */
  const fetchItems = async () => {
    try {
      setIsLoadingItems(true);
      setError(null);
      // If "all" is selected, don't pass categoryId filter
      const categoryId =
        selectedCategoryFilter === "all" ? undefined : selectedCategoryFilter;

      const response: PaginatedResponse<Menu> = await getItems(categoryId, {
        page: currentPage,
        limit: itemsPerPage,
      });

      setMenus(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.total);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : "Failed to load items. Please try again later.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoadingItems(false);
    }
  };

  /**
   * Helper function to get category name by ID
   */
  const getCategoryName = (categoryId: string): string => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.name || categoryId;
  };

  /**
   * Handle creating a new menu item
   * Sends POST request to /api/v1/items
   */
  const handleCreate = async (): Promise<void> => {
    // Validate input
    if (!formData.categoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!formData.name || !formData.name.trim()) {
      toast.error("Please enter an item name");
      return;
    }
    if (
      !formData.price ||
      isNaN(parseFloat(formData.price)) ||
      parseFloat(formData.price) < 0
    ) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      setIsSubmitting(true);
      // Call API to create item
      const newMenu = await createItem({
        categoryId: formData.categoryId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: parseFloat(formData.price),
        isAvailable: formData.available === "true",
        image: imageFile || undefined,
      });

      // Refresh items list to get updated data
      await fetchItems();

      setFormData({
        categoryId: "",
        name: "",
        price: "",
        description: "",
        available: "true",
      });
      clearImage();
      setIsCreateOpen(false);
      toast.success("Menu item created successfully");
    } catch (err: unknown) {
      // Handle different error types
      if (err instanceof ApiError) {
        if (err.status === 0) {
          toast.error("Network error: Could not connect to the server");
        } else {
          toast.error(err.message || "Failed to create menu item");
        }
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle opening edit dialog
   * Populates form with existing menu item data
   */
  const handleEdit = (id: string): void => {
    const menu = menus.find((m) => m.id === id);
    if (menu) {
      setEditingMenuId(id);
      setFormData({
        categoryId: menu.category, // menu.category is the categoryId string
        name: menu.name,
        price: menu.price.toString(),
        description: menu.description,
        available: menu.available ? "true" : "false",
      });
      // Clear image selection when opening edit
      clearImage();
      setIsEditOpen(true);
    }
  };

  /**
   * Handle updating an existing menu item
   * Sends PATCH request to /api/v1/items/:id
   */
  const handleUpdate = async (): Promise<void> => {
    // Validate input
    if (!editingMenuId) {
      toast.error("No item selected for editing");
      return;
    }
    if (!formData.categoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!formData.name || !formData.name.trim()) {
      toast.error("Please enter an item name");
      return;
    }
    if (
      !formData.price ||
      isNaN(parseFloat(formData.price)) ||
      parseFloat(formData.price) < 0
    ) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      setIsSubmitting(true);
      // Call API to update item
      const updatedMenu = await updateItem(editingMenuId, {
        categoryId: formData.categoryId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: parseFloat(formData.price),
        isAvailable: formData.available === "true",
        image: imageFile || undefined,
      });

      // Refresh items list to get updated data
      await fetchItems();

      setFormData({
        categoryId: "",
        name: "",
        price: "",
        description: "",
        available: "true",
      });
      clearImage();
      setEditingMenuId(null);
      setIsEditOpen(false);
      toast.success("Menu item updated successfully");
    } catch (err: unknown) {
      // Handle different error types
      if (err instanceof ApiError) {
        if (err.status === 404) {
          toast.error("Item not found. It may have been deleted.");
          // Refresh the list to get current data
          fetchItems();
        } else if (err.status === 0) {
          toast.error("Network error: Could not connect to the server");
        } else {
          toast.error(err.message || "Failed to update menu item");
        }
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle closing edit dialog
   */
  const handleCloseEdit = (): void => {
    setFormData({
      categoryId: "",
      name: "",
      price: "",
      description: "",
      available: "true",
    });
    clearImage();
    setEditingMenuId(null);
    setIsEditOpen(false);
  };

  /**
   * Handle deleting a menu item
   * Sends DELETE request to /api/v1/items/:id
   */
  const handleDelete = async (id: string): Promise<void> => {
    const menu = menus.find((m) => m.id === id);
    const menuName = menu?.name || "this item";

    try {
      // Call API to delete item
      await deleteItem(id);

      // Update local state by removing the deleted item
      setMenus(menus.filter((menu) => menu.id !== id));
      toast.success(`Menu "${menuName}" deleted successfully`);
    } catch (err: unknown) {
      // Handle different error types
      if (err instanceof ApiError) {
        if (err.status === 404) {
          toast.error("Item not found. It may have already been deleted.");
          // Refresh the list to get current data
          fetchItems();
        } else if (err.status === 0) {
          toast.error("Network error: Could not connect to the server");
        } else {
          toast.error(err.message || "Failed to delete menu item");
        }
      } else {
        toast.error("An unexpected error occurred");
      }
    }
  };

  /**
   * Handle toggling item availability
   * Sends PATCH request to /api/v1/items/:id/availability
   */
  const toggleAvailability = async (id: string): Promise<void> => {
    const menu = menus.find((m) => m.id === id);
    if (!menu) return;

    const newAvailability = !menu.available;

    try {
      // Call API to update availability
      const updatedMenu = await updateItemAvailability(id, newAvailability);

      // Update local state with the updated item
      setMenus(menus.map((menu) => (menu.id === id ? updatedMenu : menu)));
      toast.success(
        `Item "${menu.name}" marked as ${
          newAvailability ? "available" : "unavailable"
        }`
      );
    } catch (err: unknown) {
      // Handle different error types
      if (err instanceof ApiError) {
        if (err.status === 404) {
          toast.error("Item not found. It may have been deleted.");
          // Refresh the list to get current data
          fetchItems();
        } else if (err.status === 0) {
          toast.error("Network error: Could not connect to the server");
        } else {
          toast.error(err.message || "Failed to update availability");
        }
      } else {
        toast.error("An unexpected error occurred");
      }
    }
  };

  // Items are already paginated by backend
  const paginatedMenus = menus;

  // Pagination calculations for display
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  // Reset to page 1 when filter changes
  const handleCategoryFilterChange = (categoryId: string): void => {
    setSelectedCategoryFilter(categoryId);
    setCurrentPage(1);
    // fetchItems will be called automatically by useEffect
  };

  /**
   * Handle image file selection
   */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Clear image selection
   */
  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Menus</h1>
        <Button
          onClick={() => setIsCreateOpen(true)}
          disabled={isLoadingCategories || isLoadingItems}
          className="min-h-[44px] w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Create Menu
        </Button>
      </div>

      {/* Error State */}
      {error && !isLoadingItems && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchItems();
              fetchCategories();
            }}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Category Filter */}
      <div className="mb-4 lg:mb-6 flex-shrink-0">
        {isLoadingCategories ? (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading categories...</span>
          </div>
        ) : (
          <div className="flex gap-2 lg:gap-3 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide -mx-1 px-1">
            <button
              onClick={() => handleCategoryFilterChange("all")}
              className={`flex-shrink-0 rounded-lg px-4 py-2.5 lg:px-6 lg:py-3 text-sm lg:text-base font-medium transition-colors min-h-[44px] ${
                selectedCategoryFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryFilterChange(category.id)}
                className={`flex-shrink-0 rounded-lg px-4 py-2.5 lg:px-6 lg:py-3 text-sm lg:text-base font-medium transition-colors min-h-[44px] ${
                  selectedCategoryFilter === category.id
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

      {/* Loading State */}
      {isLoadingItems && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading menu items...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingItems && !error && menus.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">
            {selectedCategoryFilter === "all"
              ? "No menu items found."
              : `No items found in this category.`}
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            Create Your First Menu Item
          </Button>
        </div>
      )}

      {/* Mobile Card View */}
      {!isLoadingItems && !error && menus.length > 0 && (
        <div className="lg:hidden space-y-4">
          {paginatedMenus.map((menu) => (
            <div
              key={menu.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{menu.name}</h3>
                  <p className="text-sm text-gray-600">
                    {getCategoryName(menu.category)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
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
                          delete the menu "{menu.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(menu.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-gray-900">
                    ${menu.price.toFixed(2)}
                  </span>
                  <span
                    className={`ml-2 text-xs px-2 py-1 rounded ${
                      menu.available
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
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
              <p className="text-xs text-gray-500 mt-2">
                Updated: {menu.updatedAt}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Mobile Pagination */}
      {totalPages > 1 && (
        <div className="lg:hidden flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="min-h-[44px] min-w-[44px]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-700 min-w-[100px] text-center">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className="min-h-[44px] min-w-[44px]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Desktop Table View */}
      {!isLoadingItems && !error && menus.length > 0 && (
        <div className="hidden lg:flex flex-col flex-1 min-h-0 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-auto min-w-[200px] pr-1 py-2">
                    Item Name
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
                {paginatedMenus.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-gray-500"
                    >
                      No menus found in this category
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMenus.map((menu) => (
                    <TableRow key={menu.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium py-1.5 pl-3 pr-0">
                        {menu.name}
                      </TableCell>
                      <TableCell className="py-1.5 pl-1 pr-2">
                        ${menu.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="py-1.5 pl-1 pr-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            menu.available
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
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
                                <AlertDialogTitle>
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently delete the menu "{menu.name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(menu.id)}
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Desktop Pagination */}
      {totalPages > 1 && (
        <div className="hidden lg:flex items-center justify-between mt-4 shrink-0">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {endIndex} of {totalItems} menus
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="min-h-[44px]"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`min-h-[44px] min-w-[44px] ${
                          currentPage === page
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }`}
                      >
                        {page}
                      </Button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <span key={page} className="px-2">
                        ...
                      </span>
                    );
                  }
                  return null;
                }
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="min-h-[44px]"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Menu Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto bg-white border border-gray-200 shadow-xl">
          <DialogHeader>
            <DialogTitle>Create Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="menu-category">Select Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(val) =>
                  setFormData({ ...formData, categoryId: val })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
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
                onValueChange={(val) =>
                  setFormData({ ...formData, available: val })
                }
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
                onChange={handleImageChange}
                className="mt-2 min-h-[44px]"
              />
              {imagePreview && (
                <div className="mt-2 relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={clearImage}
                    className="absolute top-2 right-2"
                  >
                    Remove
                  </Button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setFormData({
                  categoryId: "",
                  name: "",
                  price: "",
                  description: "",
                  available: "true",
                });
                clearImage();
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
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto bg-white border border-gray-200 shadow-xl">
          <DialogHeader>
            <DialogTitle>Edit Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-menu-category">Select Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(val) =>
                  setFormData({ ...formData, categoryId: val })
                }
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
              <Label htmlFor="edit-menu-name">Item Name</Label>
              <Input
                id="edit-menu-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter item name"
                className="mt-2 min-h-[44px]"
              />
            </div>
            <div>
              <Label htmlFor="edit-menu-price">Price</Label>
              <Input
                id="edit-menu-price"
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
            <div>
              <Label htmlFor="edit-menu-description">Description</Label>
              <Input
                id="edit-menu-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter description"
                className="mt-2 min-h-[44px]"
              />
            </div>
            <div>
              <Label htmlFor="edit-menu-available">Availability</Label>
              <Select
                value={formData.available}
                onValueChange={(val) =>
                  setFormData({ ...formData, available: val })
                }
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
          </div>
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
