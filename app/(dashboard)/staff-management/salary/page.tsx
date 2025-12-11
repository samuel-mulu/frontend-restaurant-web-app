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
  useDeleteSalaryMutation,
  useListWithdrawalsQuery,
  useCreateWithdrawalMutation,
  useDeleteWithdrawalMutation,
  useListPaymentsQuery,
  useCreatePaymentMutation,
  useDeletePaymentMutation,
  useGetCountdownQuery,
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
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { CountdownTimer } from "@/components/features/CountdownTimer";
import { CountdownProgress } from "@/components/features/CountdownProgress";
import { WithdrawalDialog } from "@/components/features/WithdrawalDialog";
import { WithdrawalHistory } from "@/components/features/WithdrawalHistory";
import { PaymentDialog } from "@/components/features/PaymentDialog";
import { PaymentHistory } from "@/components/features/PaymentHistory";
import {
  getCurrentEthiopianDate,
  formatEthiopianDate,
  parseEthiopianDate,
  formatEthiopianDateReadable,
  ethiopianToGregorian,
} from "@/lib/utils/ethiopianCalendar";
import Link from "next/link";

interface FormData {
  staffId: string;
  amount: string;
  status: "pending" | "paid" | "";
  remarks: string;
  // Ethiopian calendar fields (simplified - only registeredDate required)
  registeredDate: string; // YYYY-MM-DD (Ethiopian) - payment date is 30 days from this
  salaryPeriod: "monthly" | "per_month";
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

// Component to show countdown in table cell
function SalaryCountdownCell({ salaryId }: { salaryId: string }) {
  const { data: countdownData } = useGetCountdownQuery(salaryId, {
    skip: !salaryId,
    pollingInterval: 60000, // Update every minute
  });

  if (!countdownData?.data) {
    return <span className="text-gray-400 text-sm">-</span>;
  }

  const { daysUntil, totalDays } = countdownData.data;

  return (
    <CountdownProgress
      daysUntil={daysUntil}
      totalDays={totalDays || 30}
      className="min-w-[200px]"
    />
  );
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
          type="text"
          inputMode="decimal"
          value={formData.amount}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "" || /^\d*\.?\d*$/.test(value)) {
              handleChange({ name: "amount", value });
            }
          }}
          placeholder="Enter salary amount"
          className={cn("mt-2 min-h-[44px]", errors.amount && "border-red-500")}
          disabled={isSubmitting}
        />
        {errors.amount && (
          <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
        )}
      </div>

      {/* Salary Period */}
      <div>
        <Label htmlFor="salary-period">
          Salary Period <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.salaryPeriod}
          onValueChange={(value) =>
            handleChange({
              name: "salaryPeriod",
              value: value as "monthly" | "per_month",
            })
          }
          disabled={isSubmitting}
        >
          <SelectTrigger className="mt-2 min-h-[44px]" id="salary-period">
            <SelectValue placeholder="Select salary period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly (1 month)</SelectItem>
            <SelectItem value="per_month">Per Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Registered Date (Ethiopian) */}
      <div>
        <Label htmlFor="registered-date">
          Registered Date (Ethiopian) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="registered-date"
          name="registeredDate"
          type="text"
          value={formData.registeredDate}
          onChange={handleChange}
          placeholder="YYYY-MM-DD"
          className={cn(
            "mt-2 min-h-[44px]",
            errors.registeredDate && "border-red-500"
          )}
          disabled={isSubmitting}
        />
        <p className="text-xs text-gray-500 mt-1">
          Format: YYYY-MM-DD (e.g., 2016-01-15) - Payment will be due 30 days
          from this date
        </p>
        {errors.registeredDate && (
          <p className="text-sm text-red-500 mt-1">{errors.registeredDate}</p>
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
  const currentEthDate = getCurrentEthiopianDate();
  const [formData, setFormData] = useState<FormData>({
    staffId: "",
    amount: "",
    status: "pending",
    remarks: "",
    registeredDate: formatEthiopianDate(currentEthDate),
    salaryPeriod: "monthly",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Withdrawal and payment management
  const [selectedSalaryId, setSelectedSalaryId] = useState<string | null>(null);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [salaryToDelete, setSalaryToDelete] = useState<Salary | null>(null);

  // API hooks for withdrawals and payments
  const { data: withdrawalsData, refetch: refetchWithdrawals } =
    useListWithdrawalsQuery(selectedSalaryId || "", {
      skip: !selectedSalaryId,
    });
  const { data: paymentsData, refetch: refetchPayments } = useListPaymentsQuery(
    selectedSalaryId || "",
    { skip: !selectedSalaryId }
  );
  const { data: countdownData } = useGetCountdownQuery(selectedSalaryId || "", {
    skip: !selectedSalaryId,
  });

  const [createWithdrawal, { isLoading: isCreatingWithdrawal }] =
    useCreateWithdrawalMutation();
  const [deleteWithdrawal, { isLoading: isDeletingWithdrawal }] =
    useDeleteWithdrawalMutation();
  const [createPayment, { isLoading: isCreatingPayment }] =
    useCreatePaymentMutation();
  const [deletePayment, { isLoading: isDeletingPayment }] =
    useDeletePaymentMutation();

  const withdrawals = withdrawalsData?.data || [];
  const payments = paymentsData?.data || [];
  const countdown = countdownData?.data;

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
  const [deleteSalary, { isLoading: isDeleting }] = useDeleteSalaryMutation();

  const isSubmitting = isCreating || isUpdating || isDeleting;
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

    // Status validation (optional but must be valid if provided)
    if (
      formData.status &&
      formData.status !== "pending" &&
      formData.status !== "paid"
    ) {
      newErrors.status = "Status must be either 'pending' or 'paid'";
    }

    // Registered date validation (simplified - just check format)
    if (!formData.registeredDate.trim()) {
      newErrors.registeredDate = "Registered date is required";
    } else {
      // Simple format check - YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.registeredDate.trim())) {
        newErrors.registeredDate = "Date must be in YYYY-MM-DD format";
      } else {
        try {
          parseEthiopianDate(formData.registeredDate);
        } catch (e) {
          newErrors.registeredDate = "Invalid date";
        }
      }
    }

    // Salary period validation
    if (!formData.salaryPeriod) {
      newErrors.salaryPeriod = "Salary period is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    const currentEthDate = getCurrentEthiopianDate();

    setFormData({
      staffId: "",
      amount: "",
      status: "pending",
      remarks: "",
      registeredDate: formatEthiopianDate(currentEthDate),
      salaryPeriod: "monthly",
    });
    setErrors({});
  };

  const handleCreate = async () => {
    if (!validateForm("create")) {
      return;
    }

    try {
      // Convert Ethiopian dates to Gregorian for backend
      // Simple payload - backend will calculate payment date as 30 days from registeredDate
      const payload: CreateSalaryInput = {
        staffId: formData.staffId,
        amount: parseFloat(formData.amount),
        status: formData.status || "pending",
        remarks: formData.remarks.trim() || undefined,
        registeredDate: formData.registeredDate,
        salaryPeriod: formData.salaryPeriod || "monthly",
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
      status: salary.status,
      remarks: salary.remarks || "",
      registeredDate:
        salary.registeredDate || formatEthiopianDate(getCurrentEthiopianDate()),
      salaryPeriod: salary.salaryPeriod || "monthly",
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
        status: formData.status || "pending",
        remarks: formData.remarks.trim() || undefined,
        registeredDate: formData.registeredDate,
        salaryPeriod: formData.salaryPeriod,
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

  // Delete handler
  const handleDeleteClick = (salary: Salary) => {
    setSalaryToDelete(salary);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!salaryToDelete) return;

    try {
      const salaryId = salaryToDelete._id || salaryToDelete.id || "";
      await deleteSalary(salaryId).unwrap();
      toast.success("Salary record deleted successfully");
      setDeleteConfirmOpen(false);
      setSalaryToDelete(null);
      refetch();
    } catch (err: any) {
      const errorMessage =
        err?.data?.message || err?.message || "Failed to delete salary record";
      toast.error(errorMessage);
    }
  };

  // Withdrawal handlers
  const handleCreateWithdrawal = async (data: {
    amount: number;
    reason: string;
    description?: string;
  }) => {
    if (!selectedSalaryId) return;

    try {
      await createWithdrawal({
        salaryId: selectedSalaryId,
        data,
      }).unwrap();
      toast.success("Withdrawal created successfully");
      setIsWithdrawalDialogOpen(false);
      refetchWithdrawals();
      refetch();
    } catch (err: any) {
      const errorMessage =
        err?.data?.message || err?.message || "Failed to create withdrawal";
      toast.error(errorMessage);
    }
  };

  const handleDeleteWithdrawal = async (withdrawalId: string) => {
    if (!selectedSalaryId) return;

    try {
      await deleteWithdrawal({
        salaryId: selectedSalaryId,
        withdrawalId,
      }).unwrap();
      toast.success("Withdrawal deleted successfully");
      refetchWithdrawals();
      refetch();
    } catch (err: any) {
      const errorMessage =
        err?.data?.message || err?.message || "Failed to delete withdrawal";
      toast.error(errorMessage);
    }
  };

  // Payment handlers
  const handleCreatePayment = async (data: {
    amount: number;
    paymentDate?: Date;
    paymentMethod?: string;
    remarks?: string;
  }) => {
    if (!selectedSalaryId) return;

    try {
      await createPayment({
        salaryId: selectedSalaryId,
        data: {
          ...data,
          paymentDate: data.paymentDate?.toISOString(),
        },
      }).unwrap();
      toast.success("Payment recorded successfully");
      setIsPaymentDialogOpen(false);
      refetchPayments();
      refetch();
    } catch (err: any) {
      const errorMessage =
        err?.data?.message || err?.message || "Failed to record payment";
      toast.error(errorMessage);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedSalaryId) return;

    try {
      await deletePayment({
        salaryId: selectedSalaryId,
        paymentId,
      }).unwrap();
      toast.success("Payment deleted successfully");
      refetchPayments();
      refetch();
    } catch (err: any) {
      const errorMessage =
        err?.data?.message || err?.message || "Failed to delete payment";
      toast.error(errorMessage);
    }
  };

  const handleViewDetails = (salary: Salary) => {
    const salaryId = salary._id || salary.id || "";
    setSelectedSalaryId(salaryId);
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
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Registered Date (Ethiopian)</TableHead>
                    <TableHead>Payment Date (Ethiopian)</TableHead>
                    <TableHead>Countdown Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-48 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalaries.map((salary: Salary) => {
                    const salaryId = salary._id || salary.id || "";
                    const netAmount = salary.netAmount ?? salary.amount;
                    const isSelected = selectedSalaryId === salaryId;

                    return (
                      <TableRow key={salaryId}>
                      <TableCell className="font-medium">
                        {getStaffName(salary)}
                      </TableCell>
                      <TableCell>{salary.amount.toFixed(2)} Br</TableCell>
                      <TableCell>
                          <span
                            className={cn(
                              "font-medium",
                              netAmount < salary.amount &&
                                "text-orange-600 dark:text-orange-400"
                            )}
                          >
                            {netAmount.toFixed(2)} Br
                          </span>
                          {salary.totalWithdrawals &&
                            salary.totalWithdrawals > 0 && (
                              <span className="text-xs text-red-600 dark:text-red-400 ml-1">
                                (-{salary.totalWithdrawals.toFixed(2)})
                              </span>
                            )}
                      </TableCell>
                        <TableCell>
                          {salary.registeredDate ? (
                            <span className="text-sm font-medium">
                              {salary.registeredDate}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {salary.ethiopianPaymentDate ? (
                            <span className="text-sm font-medium">
                              {salary.ethiopianPaymentDate}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {salary.registeredDate && salary.salaryPeriod ? (
                            <SalaryCountdownCell salaryId={salaryId} />
                          ) : (
                            <span className="text-gray-400 text-sm">
                              Not registered
                            </span>
                          )}
                        </TableCell>
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
                        <TableCell className="w-48">
                          <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(salary)}
                          className="h-8 w-8"
                              disabled={isSubmitting}
                              title="Edit salary"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleViewDetails(salary)}
                              className="h-8"
                              disabled={isSubmitting}
                              title="View details"
                            >
                              Details
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(salary);
                              }}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              disabled={isSubmitting || isDeleting}
                              title="Delete salary"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
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

      {/* Salary Details Dialog (Withdrawals & Payments) */}
      <Dialog
        open={!!selectedSalaryId}
        onOpenChange={(open) => !open && setSelectedSalaryId(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Salary Details</DialogTitle>
          </DialogHeader>

          {selectedSalaryId && (
            <div className="space-y-6 py-4">
              {/* Countdown Timer */}
              {countdown && (
                <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-900">
                  <h3 className="text-lg font-semibold mb-2">
                    Next Payment Countdown
                  </h3>
                  <CountdownTimer
                    daysUntil={countdown.daysUntil}
                    nextPaymentDate={countdown.nextPaymentDate.gregorian}
                  />
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>Registered: {countdown.registeredDate}</p>
                    <p>
                      Period:{" "}
                      {countdown.salaryPeriod === "monthly"
                        ? "Monthly (1 month)"
                        : "Per Month"}
                    </p>
                    <p>
                      Next Payment (Ethiopian):{" "}
                      {countdown.nextPaymentDate.ethiopian}
                    </p>
    </div>
                </div>
              )}

              {/* Summary */}
              {(() => {
                const selectedSalary = salaries.find(
                  (s: Salary) => (s._id || s.id) === selectedSalaryId
                );
                if (!selectedSalary) return null;

                const netAmount =
                  selectedSalary.netAmount ?? selectedSalary.amount;
                const totalWithdrawals = selectedSalary.totalWithdrawals || 0;
                const totalPayments = selectedSalary.totalPayments || 0;
                const remainingBalance = netAmount - totalPayments;

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Total Amount
                      </p>
                      <p className="text-xl font-bold">
                        {selectedSalary.amount.toFixed(2)} Br
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Net Amount
                      </p>
                      <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                        {netAmount.toFixed(2)} Br
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Total Withdrawals
                      </p>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">
                        {totalWithdrawals.toFixed(2)} Br
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Remaining Balance
                      </p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {remainingBalance.toFixed(2)} Br
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Withdrawals Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Withdrawals</h3>
                  <Button
                    onClick={() => setIsWithdrawalDialogOpen(true)}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Add Withdrawal
                  </Button>
                </div>
                <WithdrawalHistory
                  withdrawals={withdrawals}
                  onDelete={handleDeleteWithdrawal}
                  isLoading={isDeletingWithdrawal}
                />
              </div>

              {/* Payments Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Payments</h3>
                  <Button
                    onClick={() => setIsPaymentDialogOpen(true)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Record Payment
                  </Button>
                </div>
                <PaymentHistory
                  payments={payments}
                  onDelete={handleDeletePayment}
                  isLoading={isDeletingPayment}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSalaryId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      {selectedSalaryId && (
        <WithdrawalDialog
          open={isWithdrawalDialogOpen}
          onOpenChange={setIsWithdrawalDialogOpen}
          onSubmit={handleCreateWithdrawal}
          maxAmount={(() => {
            const selectedSalary = salaries.find(
              (s: Salary) => (s._id || s.id) === selectedSalaryId
            );
            return selectedSalary
              ? selectedSalary.netAmount ?? selectedSalary.amount
              : 0;
          })()}
          isLoading={isCreatingWithdrawal}
        />
      )}

      {/* Payment Dialog */}
      {selectedSalaryId && (
        <PaymentDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          onSubmit={handleCreatePayment}
          maxAmount={(() => {
            const selectedSalary = salaries.find(
              (s: Salary) => (s._id || s.id) === selectedSalaryId
            );
            if (!selectedSalary) return 0;
            const netAmount = selectedSalary.netAmount ?? selectedSalary.amount;
            const totalPayments = selectedSalary.totalPayments || 0;
            return netAmount - totalPayments;
          })()}
          isLoading={isCreatingPayment}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Salary Record"
        description={
          salaryToDelete
            ? `Are you sure you want to delete the salary record for ${getStaffName(
                salaryToDelete
              )}? This will also delete all associated withdrawals and payments. This action cannot be undone.`
            : "Are you sure you want to delete this salary record? This action cannot be undone."
        }
        isLoading={isDeleting}
      />
    </div>
  );
}
