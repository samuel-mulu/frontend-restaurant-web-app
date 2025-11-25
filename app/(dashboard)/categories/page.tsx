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
import { Edit2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useListCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from "@/stores/features/categories/categoriesApi";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";

export default function CategoryManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [categoryName, setCategoryName] = useState("");

  // Redux Toolkit hooks
  const {
    data: categories = [],
    isLoading,
    error,
    refetch,
  } = useListCategoriesQuery();

  const [createCategory, { isLoading: isCreating }] =
    useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] =
    useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  const isSubmitting = isCreating || isUpdating;
  const errorMessage =
    error && "data" in error
      ? (error.data as { message?: string })?.message || "An error occurred"
      : null;

  const handleCreate = async () => {
    if (!categoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      await createCategory({ name: categoryName.trim() }).unwrap();
      setCategoryName("");
      setIsCreateOpen(false);
      toast.success("Category created successfully");
    } catch (err: unknown) {
      const error = err as {
        data?: { message?: string };
        message?: string;
        status?: number;
      };
      const message =
        error?.data?.message || error?.message || "Failed to create category";
      if (error?.status === 409) {
        toast.error(`Category "${categoryName}" already exists`);
      } else {
        toast.error(message);
      }
    }
  };

  const handleEdit = (id: string) => {
    const category = categories.find((c: { id: string }) => c.id === id);
    if (category) {
      setEditingCategoryId(id);
      setCategoryName(category.name);
      setIsEditOpen(true);
    }
  };

  const handleUpdate = async () => {
    if (!editingCategoryId) {
      toast.error("No category selected for editing");
      return;
    }
    if (!categoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      await updateCategory({
        id: editingCategoryId,
        data: { name: categoryName.trim() },
      }).unwrap();
      setCategoryName("");
      setEditingCategoryId(null);
      setIsEditOpen(false);
      toast.success("Category updated successfully");
    } catch (err: unknown) {
      const error = err as {
        data?: { message?: string };
        message?: string;
        status?: number;
      };
      const message =
        error?.data?.message || error?.message || "Failed to update category";
      if (error?.status === 404) {
        toast.error("Category not found. It may have been deleted.");
        refetch();
      } else if (error?.status === 409) {
        toast.error(`Category "${categoryName}" already exists`);
      } else {
        toast.error(message);
      }
    }
  };

  const handleCloseEdit = () => {
    setCategoryName("");
    setEditingCategoryId(null);
    setIsEditOpen(false);
  };

  const handleDelete = async (id: string) => {
    const category = categories.find((c: { id: string }) => c.id === id);
    const categoryName = category?.name || "this category";

    try {
      await deleteCategory(id).unwrap();
      toast.success(`Category "${categoryName}" deleted successfully`);
    } catch (err: unknown) {
      const error = err as {
        data?: { message?: string };
        message?: string;
        status?: number;
      };
      const message =
        error?.data?.message || error?.message || "Failed to delete category";
      if (error?.status === 404) {
        toast.error("Category not found. It may have already been deleted.");
        refetch();
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            Categories
          </h1>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          disabled={isLoading}
          className={cn(isLoading ? "spin-in" : "")}
        >
          Create Category
        </Button>
      </header>

      {errorMessage && !isLoading && (
        <ErrorState message={errorMessage} onRetry={() => refetch()} />
      )}

      {isLoading && <LoadingState message="Loading categories..." />}

      {!isLoading && !errorMessage && categories.length === 0 && (
        <EmptyState
          message="No categories found."
          actionLabel="Create Your First Category"
          onAction={() => setIsCreateOpen(true)}
        />
      )}

      {/* Mobile Card View */}
      {!isLoading && !errorMessage && categories.length > 0 && (
        <div className="lg:hidden space-y-4">
          {categories.map(
            (category: {
              id: string;
              name: string;
              products: number;
              updatedAt: string;
            }) => (
              <div
                key={category.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
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
                    <DeleteConfirmDialog
                      title="Are you sure?"
                      description="This action cannot be undone. This will permanently delete the category"
                      itemName={category.name}
                      onConfirm={() => handleDelete(category.id)}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Updated: {category.updatedAt}
                </p>
              </div>
            )
          )}
        </div>
      )}

      {/* Desktop Table View */}
      {!isLoading && !errorMessage && categories.length > 0 && (
        <div className="hidden lg:block soft-card overflow-hidden">
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
              {categories.map(
                (category: {
                  id: string;
                  name: string;
                  products: number;
                  updatedAt: string;
                }) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
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
                        <DeleteConfirmDialog
                          title="Are you sure?"
                          description="This action cannot be undone. This will permanently delete the category"
                          itemName={category.name}
                          onConfirm={() => handleDelete(category.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Category Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl">
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
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl">
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
