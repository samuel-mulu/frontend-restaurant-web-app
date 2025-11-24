"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
// Textarea component - using Input for now, can be replaced with proper Textarea component
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useListSalariesQuery,
  useCreateSalaryMutation,
  useUpdateSalaryMutation,
  type Salary,
  type CreateSalaryInput,
  type UpdateSalaryInput,
} from "@/stores/features/salary/salaryApi";
import { useListStaffQuery } from "@/stores/features/staff/staffApi";
import { toast } from "sonner";
import {
  DollarSign,
  Edit2,
  Search,
  X,
  Filter,
  Loader2,
  Calendar,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import Link from "next/link";

interface FormData {
  staffId: string;
  amount: string;
  month: string; // YYYY-MM format
  year: string;
  paymentDate: string; // ISO date string
  status: "pending" | "paid" | "";
  remarks: string;
}

// Reusable Salary Form Component
interface SalaryFormProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  mode: "create" | "edit";
  staffList: Array<{
    id: string;
    name: string;
    salary?: number;
    role?: string;
  }>;
  onStaffChange?: (staffId: string) => void;
}

function SalaryForm({
  formData,
  setFormData,
  errors,
  isSubmitting,
  mode,
  staffList,
  onStaffChange,
}: SalaryFormProps) {
  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | { name: string; value: string }
  ) => {
    const name = "name" in e ? e.name : e.target.name;
    const value = "value" in e ? e.value : e.target.value;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Get current month/year for default values
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, "0")}`;
  const currentYear = currentDate.getFullYear().toString();

  return (
    <div className="space-y-4">
      {/* Staff Selection */}
      <div>
        <Label htmlFor="salary-staff">
          Staff <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.staffId}
          onValueChange={(value) => {
            handleChange({ name: "staffId", value });
            // Auto-populate salary amount from staff record when creating
            if (mode === "create" && onStaffChange) {
              onStaffChange(value);
            }
          }}
          disabled={isSubmitting || mode === "edit"}
        >
          <SelectTrigger className="mt-2 min-h-[44px]" id="salary-staff">
            <SelectValue placeholder="Select staff member" />
          </SelectTrigger>
          <SelectContent>
            {staffList.map(
              (staff: {
                id: string;
                name: string;
                salary?: number;
                role?: string;
              }) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.name} {staff.role ? `(${staff.role})` : ""}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        {errors.staffId && (
          <p className="text-sm text-red-500 mt-1">{errors.staffId}</p>
        )}
        {mode === "edit" && (
          <p className="text-xs text-gray-500 mt-1">
            Staff cannot be changed after creation
          </p>
        )}
      </div>

      {/* Amount */}
      <div>
        <Label htmlFor="salary-amount">
          Amount (Birr) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="salary-amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          value={formData.amount}
          onChange={handleChange}
          placeholder="Enter salary amount"
          className={cn("mt-2 min-h-[44px]", errors.amount && "border-red-500")}
          disabled={isSubmitting}
        />
        {errors.amount && (
          <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
        )}
      </div>

      {/* Month */}
      <div>
        <Label htmlFor="salary-month">
          Month <span className="text-red-500">*</span>
        </Label>
        <Input
          id="salary-month"
          name="month"
          type="month"
          value={formData.month || currentMonth}
          onChange={handleChange}
          className={cn("mt-2 min-h-[44px]", errors.month && "border-red-500")}
          disabled={isSubmitting || mode === "edit"}
        />
        <p className="text-xs text-gray-500 mt-1">
          Format: YYYY-MM (e.g., 2024-01)
        </p>
        {errors.month && (
          <p className="text-sm text-red-500 mt-1">{errors.month}</p>
        )}
        {mode === "edit" && (
          <p className="text-xs text-gray-500 mt-1">
            Month cannot be changed after creation
          </p>
        )}
      </div>

      {/* Year */}
      <div>
        <Label htmlFor="salary-year">
          Year <span className="text-red-500">*</span>
        </Label>
        <Input
          id="salary-year"
          name="year"
          type="number"
          min="2020"
          max="2100"
          value={formData.year || currentYear}
          onChange={handleChange}
          placeholder="Enter year (2020-2100)"
          className={cn("mt-2 min-h-[44px]", errors.year && "border-red-500")}
          disabled={isSubmitting || mode === "edit"}
        />
        {errors.year && (
          <p className="text-sm text-red-500 mt-1">{errors.year}</p>
        )}
        {mode === "edit" && (
          <p className="text-xs text-gray-500 mt-1">
            Year cannot be changed after creation
          </p>
        )}
      </div>

      {/* Payment Date */}
      <div>
        <Label htmlFor="salary-payment-date">
          Payment Date <span className="text-red-500">*</span>
        </Label>
        <Input
          id="salary-payment-date"
          name="paymentDate"
          type="date"
          value={formData.paymentDate}
          onChange={handleChange}
          className={cn(
            "mt-2 min-h-[44px]",
            errors.paymentDate && "border-red-500"
          )}
          disabled={isSubmitting}
        />
        {errors.paymentDate && (
          <p className="text-sm text-red-500 mt-1">{errors.paymentDate}</p>
        )}
      </div>

      {/* Status */}
      <div>
        <Label htmlFor="salary-status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => handleChange({ name: "status", value })}
          disabled={isSubmitting}
        >
          <SelectTrigger className="mt-2 min-h-[44px]" id="salary-status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
        {errors.status && (
          <p className="text-sm text-red-500 mt-1">{errors.status}</p>
        )}
      </div>

      {/* Remarks */}
      <div>
        <Label htmlFor="salary-remarks">
          Remarks <span className="text-gray-500 text-xs">(Optional)</span>
        </Label>
        <Input
          id="salary-remarks"
          name="remarks"
          value={formData.remarks}
          onChange={handleChange}
          placeholder="Enter any remarks or notes"
          className={cn(
            "mt-2 min-h-[100px]",
            errors.remarks && "border-red-500"
          )}
          disabled={isSubmitting}
        />
        {errors.remarks && (
          <p className="text-sm text-red-500 mt-1">{errors.remarks}</p>
        )}
      </div>
    </div>
  );
}

export default function SalaryManagementPage() {
  const auth = useRequireAuth({
    allowedRoles: ["owner"],
    redirectTo: "/",
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formData, setFormData] = useState<FormData>({
    staffId: "",
    amount: "",
    month: "",
    year: "",
    paymentDate: "",
    status: "pending",
    remarks: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Show loading while checking authorization
  if (auth.isChecking || !auth.hydrated) {
    return <Loading fullScreen text="Checking authorization..." size="lg" />;
  }

  // Don't render if not authorized (redirect handled by useRequireAuth)
  if (!auth.isAuthenticated || !auth.isAuthorized) {
    return null;
  }

  // Fetch staff list for dropdown
  const { data: staffData } = useListStaffQuery({
    status: "active",
    role:
      roleFilter !== "all"
        ? (roleFilter as "cashier" | "waiter" | "staff")
        : undefined,
    limit: 100,
  });

  const staffList = useMemo(() => {
    if (!staffData?.staff) return [];
    return staffData.staff.map(
      (staff: {
        _id?: string;
        id?: string;
        name: string;
        salary?: number;
        role?: string;
      }) => ({
        id: staff._id || staff.id || "",
        name: staff.name,
        salary: staff.salary || 0,
        role: staff.role,
      })
    );
  }, [staffData]);

  // Get full staff data for salary lookup
  const staffMap = useMemo(() => {
    if (!staffData?.staff) return new Map();
    const map = new Map();
    staffData.staff.forEach(
      (staff: { _id?: string; id?: string; salary?: number }) => {
        const id = staff._id || staff.id || "";
        map.set(id, staff);
      }
    );
    return map;
  }, [staffData]);

  // Fetch salaries
  const {
    data: salaryData,
    isLoading,
    error,
    refetch,
  } = useListSalariesQuery({
    staffId: staffFilter !== "all" ? staffFilter : undefined,
    month: monthFilter || undefined,
    year: yearFilter ? parseInt(yearFilter) : undefined,
    status:
      statusFilter !== "all" ? (statusFilter as "pending" | "paid") : undefined,
    page: 1,
    limit: 100,
  });

  const [createSalary, { isLoading: isCreating }] = useCreateSalaryMutation();
  const [updateSalary, { isLoading: isUpdating }] = useUpdateSalaryMutation();

  const isSubmitting = isCreating || isUpdating;
  const salaries = salaryData?.salaries || [];
  const errorMessage =
    error && "data" in error
      ? (error.data as { message?: string })?.message || "An error occurred"
      : null;

  // Reset staff filter when role filter changes
  useEffect(() => {
    if (roleFilter !== "all") {
      setStaffFilter("all");
    }
  }, [roleFilter]);

  // Filter salaries client-side for search and role
  const filteredSalaries = useMemo(() => {
    let filtered = salaries;

    // Filter by role if selected
    if (roleFilter !== "all") {
      filtered = filtered.filter((s: Salary) => {
        const staffRole =
          typeof s.staffId === "object" && s.staffId?.role
            ? s.staffId.role
            : "";
        return staffRole === roleFilter;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((s: Salary) => {
        const staffName =
          typeof s.staffId === "object" && s.staffId?.name
            ? s.staffId.name
            : "";
        return (
          staffName.toLowerCase().includes(query) ||
          s.amount.toString().includes(query) ||
          s.month?.toLowerCase().includes(query) ||
          s.remarks?.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [salaries, searchQuery, roleFilter]);

  const validateForm = (mode: "create" | "edit"): boolean => {
    const newErrors: Record<string, string> = {};

    // Staff ID validation
    if (!formData.staffId.trim()) {
      newErrors.staffId = "Staff member is required";
    }

    // Amount validation
    if (!formData.amount.trim()) {
      newErrors.amount = "Amount is required";
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount < 0) {
        newErrors.amount =
          "Amount must be a valid number greater than or equal to 0";
      }
    }

    // Month validation
    if (!formData.month.trim()) {
      newErrors.month = "Month is required";
    } else if (!/^\d{4}-\d{2}$/.test(formData.month)) {
      newErrors.month = "Month must be in YYYY-MM format (e.g., 2024-01)";
    }

    // Year validation
    if (!formData.year.trim()) {
      newErrors.year = "Year is required";
    } else {
      const year = parseInt(formData.year);
      if (isNaN(year) || year < 2020 || year > 2100) {
        newErrors.year = "Year must be between 2020 and 2100";
      }
    }

    // Payment Date validation
    if (!formData.paymentDate.trim()) {
      newErrors.paymentDate = "Payment date is required";
    } else {
      const date = new Date(formData.paymentDate);
      if (isNaN(date.getTime())) {
        newErrors.paymentDate = "Please enter a valid date";
      }
    }

    // Status validation (optional but must be valid if provided)
    if (
      formData.status &&
      formData.status !== "pending" &&
      formData.status !== "paid"
    ) {
      newErrors.status = "Status must be either 'pending' or 'paid'";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}`;
    const currentYear = currentDate.getFullYear().toString();

    setFormData({
      staffId: "",
      amount: "",
      month: currentMonth,
      year: currentYear,
      paymentDate: "",
      status: "pending",
      remarks: "",
    });
    setErrors({});
  };

  const handleCreate = async () => {
    if (!validateForm("create")) {
      return;
    }

    try {
      const payload: CreateSalaryInput = {
        staffId: formData.staffId,
        amount: parseFloat(formData.amount),
        month: formData.month,
        year: parseInt(formData.year),
        paymentDate: new Date(formData.paymentDate).toISOString(),
        status: formData.status || "pending",
        remarks: formData.remarks.trim() || undefined,
      };

      await createSalary(payload).unwrap();
      toast.success("Salary record created successfully");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      const errorMessage =
        err?.data?.message || err?.message || "Failed to create salary record";
      toast.error(errorMessage);

      // Handle duplicate error
      if (err?.status === 409 || errorMessage.includes("already exists")) {
        setErrors({
          month:
            "A salary record already exists for this staff member, month, and year",
        });
      }
    }
  };

  const handleEdit = (salary: Salary) => {
    const staffId =
      typeof salary.staffId === "string"
        ? salary.staffId
        : salary.staffId?._id || salary.staffId?.id || "";

    setFormData({
      staffId,
      amount: salary.amount.toString(),
      month: salary.month,
      year: salary.year.toString(),
      paymentDate: salary.paymentDate
        ? new Date(salary.paymentDate).toISOString().split("T")[0]
        : "",
      status: salary.status,
      remarks: salary.remarks || "",
    });
    setEditingSalaryId(salary._id || salary.id || "");
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingSalaryId || !validateForm("edit")) {
      return;
    }

    try {
      const payload: UpdateSalaryInput = {
        amount: parseFloat(formData.amount),
        paymentDate: new Date(formData.paymentDate).toISOString(),
        status: formData.status || "pending",
        remarks: formData.remarks.trim() || undefined,
      };

      await updateSalary({ id: editingSalaryId, data: payload }).unwrap();
      toast.success("Salary record updated successfully");
      setIsEditOpen(false);
      setEditingSalaryId(null);
      resetForm();
      refetch();
    } catch (err: any) {
      const errorMessage =
        err?.data?.message || err?.message || "Failed to update salary record";
      toast.error(errorMessage);
    }
  };

  const getStaffName = (salary: Salary): string => {
    if (typeof salary.staffId === "object" && salary.staffId?.name) {
      return salary.staffId.name;
    }
    return "Unknown";
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header with Navigation Tabs */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            Salary Management
          </h1>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-sm">
            <Link
              href="/staff-management"
              className="px-4 py-2 rounded-md text-sm font-medium transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Staff
            </Link>
            <button className="px-4 py-2 rounded-md text-sm font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm">
              Salary
            </button>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Create Salary
        </Button>
      </header>

      {errorMessage && !isLoading && (
        <ErrorState message={errorMessage} onRetry={() => refetch()} />
      )}

      {isLoading && <LoadingState message="Loading salary records..." />}

      {!isLoading && !errorMessage && (
        <>
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-2 rounded-full border bg-white dark:bg-slate-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by staff name, amount, or remarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 rounded-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-fit rounded-full shrink-0 space-x-2">
                  <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="waiter">Waiter</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>

              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="w-fit rounded-full shrink-0 space-x-2">
                  <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <SelectValue placeholder="Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staffList.map(
                    (staff: { id: string; name: string; role?: string }) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name} {staff.role ? `(${staff.role})` : ""}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>

              <Input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                placeholder="Month"
                className="w-[150px] rounded-full"
              />

              <Input
                type="number"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                placeholder="Year"
                min="2020"
                max="2100"
                className="w-[100px] rounded-full"
              />

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-fit rounded-full shrink-0 space-x-2">
                  <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          {filteredSalaries.length === 0 ? (
            <EmptyState
              message="No salary records found"
              actionLabel="Create Salary Record"
              onAction={() => setIsCreateOpen(true)}
            />
          ) : (
            <div className="rounded-xl bg-white dark:bg-slate-800 border dark:border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Month/Year</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalaries.map((salary: Salary) => (
                    <TableRow key={salary._id || salary.id}>
                      <TableCell className="font-medium">
                        {getStaffName(salary)}
                      </TableCell>
                      <TableCell>{salary.amount.toFixed(2)} Br</TableCell>
                      <TableCell>
                        {salary.month} / {salary.year}
                      </TableCell>
                      <TableCell>{formatDate(salary.paymentDate)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            salary.status === "paid"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                          }
                        >
                          {salary.status === "paid" ? "Paid" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {salary.remarks || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(salary)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Create Salary Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Salary Record</DialogTitle>
          </DialogHeader>
          <SalaryForm
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            isSubmitting={isSubmitting}
            mode="create"
            staffList={staffList}
            onStaffChange={(staffId) => {
              // Auto-populate salary amount from staff record
              const selectedStaff = staffMap.get(staffId);
              if (selectedStaff && selectedStaff.salary) {
                setFormData((prev) => ({
                  ...prev,
                  amount: selectedStaff.salary.toString(),
                }));
              }
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Salary Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Salary Record</DialogTitle>
          </DialogHeader>
          <SalaryForm
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            isSubmitting={isSubmitting}
            mode="edit"
            staffList={staffList}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setEditingSalaryId(null);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
