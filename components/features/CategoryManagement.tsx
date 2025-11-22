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
import { Edit2, Trash2, Loader2 } from "lucide-react";
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
import { Category } from "@/lib/types";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  ApiError,
} from "@/lib/api/categories";

export function CategoryManagement() {
  // State management
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [categoryName, setCategoryName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  /**
   * Fetch all categories from the API
   * This runs when the component first loads
   */
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  /**
   * Handle creating a new category
   * Sends POST request to /api/v1/categories
   */
  const handleCreate = async () => {
    // Validate input
    if (!categoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      setIsSubmitting(true);
      // Call API to create category
      const newCategory = await createCategory(categoryName);

      // Update local state with the new category
      setCategories([...categories, newCategory]);
      setCategoryName("");
      setIsCreateOpen(false);
      toast.success("Category created successfully");
    } catch (err: unknown) {
      // Handle different error types
      if (err instanceof ApiError) {
        if (err.status === 409) {
          toast.error(`Category "${categoryName}" already exists`);
        } else if (err.status === 0) {
          toast.error("Network error: Could not connect to the server");
        } else {
          toast.error(err.message || "Failed to create category");
        }
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (id: string) => {
    const category = categories.find((c) => c.id === id);
    if (category) {
      setEditingCategoryId(id);
      setCategoryName(category.name);
      setIsEditOpen(true);
    }
  };

  /**
   * Handle updating an existing category
   * Sends PATCH request to /api/v1/categories/:id
   */
  const handleUpdate = async () => {
    // Validate input
    if (!editingCategoryId) {
      toast.error("No category selected for editing");
      return;
    }
    if (!categoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      setIsSubmitting(true);
      // Call API to update category
      const updatedCategory = await updateCategory(
        editingCategoryId,
        categoryName
      );

      // Update local state with the updated category
      setCategories(
        categories.map((cat) =>
          cat.id === editingCategoryId ? updatedCategory : cat
        )
      );
      setCategoryName("");
      setEditingCategoryId(null);
      setIsEditOpen(false);
      toast.success("Category updated successfully");
    } catch (err: unknown) {
      // Handle different error types
      if (err instanceof ApiError) {
        if (err.status === 404) {
          toast.error("Category not found. It may have been deleted.");
          // Refresh the list to get current data
          fetchCategories();
        } else if (err.status === 409) {
          toast.error(`Category "${categoryName}" already exists`);
        } else if (err.status === 0) {
          toast.error("Network error: Could not connect to the server");
        } else {
          toast.error(err.message || "Failed to update category");
        }
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseEdit = () => {
    setCategoryName("");
    setEditingCategoryId(null);
    setIsEditOpen(false);
  };

  /**
   * Handle deleting a category
   * Sends DELETE request to /api/v1/categories/:id
   */
  const handleDelete = async (id: string) => {
    const category = categories.find((c) => c.id === id);
    const categoryName = category?.name || "this category";

    try {
      // Call API to delete category
      await deleteCategory(id);

      // Update local state by removing the deleted category
      setCategories(categories.filter((cat) => cat.id !== id));
      toast.success(`Category "${categoryName}" deleted successfully`);
    } catch (err: unknown) {
      // Handle different error types
      if (err instanceof ApiError) {
        if (err.status === 404) {
          toast.error("Category not found. It may have already been deleted.");
          // Refresh the list to get current data
          fetchCategories();
        } else if (err.status === 0) {
          toast.error("Network error: Could not connect to the server");
        } else {
          toast.error(err.message || "Failed to delete category");
        }
      } else {
        toast.error("An unexpected error occurred");
      }
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="min-h-[44px] w-full sm:w-auto"
          disabled={isLoading}
        >
          Create Category
        </Button>
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCategories}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading categories...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No categories found.</p>
          <Button onClick={() => setIsCreateOpen(true)}>
            Create Your First Category
          </Button>
        </div>
      )}

      {/* Mobile Card View */}
      {!isLoading && !error && categories.length > 0 && (
        <div className="lg:hidden space-y-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {category.products}{" "}
                    {category.products === 1 ? "product" : "products"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => handleEdit(category.id)}
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
                    <AlertDialogContent className="bg-white border border-gray-200 shadow-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete the category "{category.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(category.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Updated: {category.updatedAt}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Desktop Table View */}
      {!isLoading && !error && categories.length > 0 && (
        <div className="hidden lg:block rounded-lg border border-gray-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Updated At</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.products}</TableCell>
                  <TableCell>{category.updatedAt}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(category.id)}
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
                        <AlertDialogContent className="bg-white border border-gray-200 shadow-xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will
                              permanently delete the category "{category.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(category.id)}
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
      )}

      {/* Create Category Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto bg-white border border-gray-200 shadow-xl">
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Enter category name"
              className="mt-2 min-h-[44px]"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setCategoryName("");
              }}
              className="min-h-[44px] w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="min-h-[44px] w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Category"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={isEditOpen} onOpenChange={handleCloseEdit}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto bg-white border border-gray-200 shadow-xl">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="edit-category-name">Category Name</Label>
            <Input
              id="edit-category-name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Enter category name"
              className="mt-2 min-h-[44px]"
            />
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
              disabled={isSubmitting}
              className="min-h-[44px] w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Category"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
