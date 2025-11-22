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
import { Edit2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
import { initialMenus, type Menu } from "@/lib/menu-store";

interface MenuFormData {
  category: string;
  name: string;
  price: string;
  description: string;
  available: string;
}

const categories: string[] = [
  "appetizers",
  "main-courses",
  "drinks",
  "desserts",
];

const categoryDisplayNames: Record<string, string> = {
  appetizers: "Appetizers",
  "main-courses": "Main Courses",
  drinks: "Drinks",
  desserts: "Desserts",
};

export function MenuManagement() {
  const [menus, setMenus] = useState<Menu[]>(() => {
    // Initialize from localStorage if available, otherwise use seed data
    if (typeof window !== "undefined") {
      const storedMenus = localStorage.getItem("restaurant-menus");
      if (storedMenus) {
        try {
          return JSON.parse(storedMenus);
        } catch (error) {
          // If parse fails, use initial menus
          localStorage.setItem(
            "restaurant-menus",
            JSON.stringify(initialMenus)
          );
          return initialMenus;
        }
      } else {
        // First time - initialize with seed data
        localStorage.setItem("restaurant-menus", JSON.stringify(initialMenus));
        return initialMenus;
      }
    }
    return initialMenus;
  });
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [formData, setFormData] = useState<MenuFormData>({
    category: "",
    name: "",
    price: "",
    description: "",
    available: "true",
  });

  const handleCreate = (): void => {
    if (formData.category && formData.name && formData.price) {
      const newMenu: Menu = {
        id: `${formData.category}-${Date.now()}`,
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        description: formData.description,
        available: formData.available === "true",
        updatedAt: new Date().toISOString().split("T")[0],
      };
      const updatedMenus = [...menus, newMenu];
      setMenus(updatedMenus);
      // Sync to localStorage for CashierView
      localStorage.setItem("restaurant-menus", JSON.stringify(updatedMenus));
      window.dispatchEvent(new Event("menus-updated"));
      setFormData({
        category: "",
        name: "",
        price: "",
        description: "",
        available: "true",
      });
      setIsCreateOpen(false);
      toast.success("Menu created successfully");
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const handleEdit = (id: string): void => {
    const menu = menus.find((m) => m.id === id);
    if (menu) {
      setEditingMenuId(id);
      setFormData({
        category: menu.category,
        name: menu.name,
        price: menu.price.toString(),
        description: menu.description,
        available: menu.available ? "true" : "false",
      });
      setIsEditOpen(true);
    }
  };

  const handleUpdate = (): void => {
    if (editingMenuId && formData.category && formData.name && formData.price) {
      const updatedMenus = menus.map((menu) =>
        menu.id === editingMenuId
          ? {
              ...menu,
              name: formData.name,
              category: formData.category,
              price: parseFloat(formData.price),
              description: formData.description,
              available: formData.available === "true",
              updatedAt: new Date().toISOString().split("T")[0],
            }
          : menu
      );
      setMenus(updatedMenus);
      // Sync to localStorage for CashierView
      localStorage.setItem("restaurant-menus", JSON.stringify(updatedMenus));
      window.dispatchEvent(new Event("menus-updated"));
      setFormData({
        category: "",
        name: "",
        price: "",
        description: "",
        available: "true",
      });
      setEditingMenuId(null);
      setIsEditOpen(false);
      toast.success("Menu updated successfully");
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const handleCloseEdit = (): void => {
    setFormData({
      category: "",
      name: "",
      price: "",
      description: "",
      available: "true",
    });
    setEditingMenuId(null);
    setIsEditOpen(false);
  };

  const handleDelete = (id: string): void => {
    const menu = menus.find((m) => m.id === id);
    const updatedMenus = menus.filter((menu) => menu.id !== id);
    setMenus(updatedMenus);
    // Sync to localStorage for CashierView
    localStorage.setItem("restaurant-menus", JSON.stringify(updatedMenus));
    window.dispatchEvent(new Event("menus-updated"));
    toast.success(`Menu "${menu?.name}" deleted successfully`);
  };

  const toggleAvailability = (id: string): void => {
    const updatedMenus = menus.map((menu) =>
      menu.id === id ? { ...menu, available: !menu.available } : menu
    );
    setMenus(updatedMenus);
    // Sync to localStorage for CashierView
    localStorage.setItem("restaurant-menus", JSON.stringify(updatedMenus));
    window.dispatchEvent(new Event("menus-updated"));
  };

  // Filter menus by category
  const filteredMenus =
    selectedCategoryFilter === "all"
      ? menus
      : menus.filter((menu) => menu.category === selectedCategoryFilter);

  // Pagination calculations
  const totalPages = Math.ceil(filteredMenus.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMenus = filteredMenus.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  const handleCategoryFilterChange = (category: string): void => {
    setSelectedCategoryFilter(category);
    setCurrentPage(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Menus</h1>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="min-h-[44px] w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Create Menu
        </Button>
      </div>

      {/* Category Filter */}
      <div className="mb-4 lg:mb-6">
        <div className="flex gap-2 lg:gap-3 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
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
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryFilterChange(cat)}
              className={`flex-shrink-0 rounded-lg px-4 py-2.5 lg:px-6 lg:py-3 text-sm lg:text-base font-medium transition-colors min-h-[44px] ${
                selectedCategoryFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
              }`}
            >
              {categoryDisplayNames[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Card View */}
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
                  {categoryDisplayNames[menu.category] || menu.category}
                </p>
                <p className="text-sm text-gray-500 mt-1">{menu.description}</p>
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
        {paginatedMenus.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No menus found in this category
          </div>
        )}
      </div>

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
      <div className="hidden lg:block rounded-lg border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMenus.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-gray-500"
                >
                  No menus found in this category
                </TableCell>
              </TableRow>
            ) : (
              paginatedMenus.map((menu) => (
                <TableRow key={menu.id}>
                  <TableCell className="font-medium">{menu.name}</TableCell>
                  <TableCell>
                    {categoryDisplayNames[menu.category] || menu.category}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {menu.description}
                  </TableCell>
                  <TableCell>${menu.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        menu.available
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {menu.available ? "Available" : "Unavailable"}
                    </span>
                  </TableCell>
                  <TableCell>{menu.updatedAt}</TableCell>
                  <TableCell>
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
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
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

      {/* Desktop Pagination */}
      {totalPages > 1 && (
        <div className="hidden lg:flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to{" "}
            {Math.min(endIndex, filteredMenus.length)} of {filteredMenus.length}{" "}
            menus
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
                      {categoryDisplayNames[cat] || cat}
                    </SelectItem>
                  ))}
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
              Create Menu
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
                      {categoryDisplayNames[cat] || cat}
                    </SelectItem>
                  ))}
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
              className="min-h-[44px] w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Update Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
