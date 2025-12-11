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
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useListPendingApprovalsQuery,
  useApproveItemMutation,
  useRejectItemMutation,
  ItemResponse,
} from "@/stores/features/items/itemsApi";
import {
  useListPendingApprovalsQuery as useListPendingInventoryApprovalsQuery,
  useApproveInventoryMutation,
  useRejectInventoryMutation,
  InventoryResponse,
} from "@/stores/features/inventory/inventoryApi";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";

interface ApprovalManagementProps {
  type: "menu" | "inventory";
}

export function ApprovalManagement({ type }: ApprovalManagementProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Menu items queries
  const {
    data: menuItems = [],
    isLoading: isLoadingMenu,
    error: menuError,
    refetch: refetchMenu,
  } = useListPendingApprovalsQuery(undefined, {
    skip: type !== "menu",
  });

  const [approveMenuItem, { isLoading: isApprovingMenu }] =
    useApproveItemMutation();
  const [rejectMenuItem, { isLoading: isRejectingMenu }] =
    useRejectItemMutation();

  // Inventory items queries
  const {
    data: inventoryItems = [],
    isLoading: isLoadingInventory,
    error: inventoryError,
    refetch: refetchInventory,
  } = useListPendingInventoryApprovalsQuery(undefined, {
    skip: type !== "inventory",
  });

  const [approveInventoryItem, { isLoading: isApprovingInventory }] =
    useApproveInventoryMutation();
  const [rejectInventoryItem, { isLoading: isRejectingInventory }] =
    useRejectInventoryMutation();

  const isLoading =
    type === "menu" ? isLoadingMenu : isLoadingInventory;
  const error = type === "menu" ? menuError : inventoryError;
  const items = type === "menu" ? menuItems : inventoryItems;
  const isApproving = type === "menu" ? isApprovingMenu : isApprovingInventory;
  const isRejecting = type === "menu" ? isRejectingMenu : isRejectingInventory;

  const handleApprove = async (id: string) => {
    try {
      if (type === "menu") {
        await approveMenuItem(id).unwrap();
        toast.success("Menu item approved successfully");
      } else {
        await approveInventoryItem(id).unwrap();
        toast.success("Inventory item approved successfully");
      }
      setSelectedItems((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      const message =
        err?.data?.message || err?.message || "Failed to approve item";
      toast.error(message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      if (type === "menu") {
        await rejectMenuItem(id).unwrap();
        toast.success("Menu item rejected successfully");
      } else {
        await rejectInventoryItem(id).unwrap();
        toast.success("Inventory item rejected successfully");
      }
      setSelectedItems((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      const message =
        err?.data?.message || err?.message || "Failed to reject item";
      toast.error(message);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedItems.size === 0) {
      toast.error("Please select items to approve");
      return;
    }

    try {
      const promises = Array.from(selectedItems).map((id) =>
        type === "menu" ? approveMenuItem(id).unwrap() : approveInventoryItem(id).unwrap()
      );
      await Promise.all(promises);
      toast.success(`${selectedItems.size} item(s) approved successfully`);
      setSelectedItems(new Set());
    } catch (err: any) {
      const message =
        err?.data?.message || err?.message || "Failed to approve items";
      toast.error(message);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((item) => item.id)));
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading pending approvals..." />;
  }

  if (error) {
    let errorMessage = "An error occurred";
    
    if (error && "data" in error) {
      const errorData = error.data as { message?: string };
      errorMessage = errorData?.message || "An error occurred";
    } else if (error && "status" in error && error.status === "FETCH_ERROR") {
      errorMessage = "Network request failed. Please check your connection and try again.";
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    return (
      <ErrorState
        message={errorMessage}
        onRetry={() => {
          if (type === "menu") {
            refetchMenu();
          } else {
            refetchInventory();
          }
        }}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        message={`No pending ${type === "menu" ? "menu" : "inventory"} items to approve`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {selectedItems.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedItems.size} item(s) selected
          </span>
          <Button
            onClick={handleBulkApprove}
            disabled={isApproving}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isApproving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve Selected
              </>
            )}
          </Button>
        </div>
      )}

      <div className="soft-card overflow-hidden">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === items.length && items.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                {type === "menu" && <TableHead>Category</TableHead>}
                <TableHead>Description</TableHead>
                <TableHead>Price</TableHead>
                {type === "inventory" && (
                  <>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                  </>
                )}
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: ItemResponse | InventoryResponse) => {
                const isSelected = selectedItems.has(item.id);
                const menuItem = type === "menu" ? (item as ItemResponse) : null;
                const inventoryItem =
                  type === "inventory" ? (item as InventoryResponse) : null;

                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "hover:bg-gray-50 dark:hover:bg-slate-700",
                      isSelected && "bg-blue-50 dark:bg-blue-900/20"
                    )}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    {type === "menu" && menuItem && (
                      <TableCell>
                        {menuItem.category?.name || menuItem.categoryId || "N/A"}
                      </TableCell>
                    )}
                    <TableCell className="max-w-xs truncate">
                      {item.description || "—"}
                    </TableCell>
                    <TableCell>
                      {item.price?.toFixed(2) || "0.00"} ብር
                    </TableCell>
                    {type === "inventory" && inventoryItem && (
                      <>
                        <TableCell>{inventoryItem.quantity}</TableCell>
                        <TableCell>{inventoryItem.unit}</TableCell>
                      </>
                    )}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          item.approvalStatus === "pendingapproval" &&
                            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        )}
                      >
                        {item.approvalStatus === "pendingapproval"
                          ? "Pending Approval"
                          : item.approvalStatus || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(item.id)}
                          disabled={isApproving || isRejecting}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          {isApproving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(item.id)}
                          disabled={isApproving || isRejecting}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          {isRejecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

