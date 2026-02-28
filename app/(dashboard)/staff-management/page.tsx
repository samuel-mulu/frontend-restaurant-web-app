"use client";

import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/ui/loading";
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
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";
import {
    useCreateStaffMutation,
    useDeleteStaffMutation,
    useListStaffQuery,
    useUpdateStaffMutation,
    type Staff,
} from "@/stores/features/staff/staffApi";
import {
    Edit2,
    Eye,
    EyeOff,
    Filter,
    Loader2,
    Search,
    Trash2,
    UserPlus,
    X,
} from "lucide-react";
import Link from "next/link";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";

type StaffRole = "cashier" | "waiter" | "staff";

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: StaffRole | "";
  salary: string;
  color: string;
}

const STAFF_COLOR_OPTIONS = [
  { value: "red", label: "Red", className: "bg-red-500" },
  { value: "orange", label: "Orange", className: "bg-orange-500" },
  { value: "amber", label: "Amber", className: "bg-amber-500" },
  { value: "yellow", label: "Yellow", className: "bg-yellow-500" },
  { value: "lime", label: "Lime", className: "bg-lime-500" },
  { value: "green", label: "Green", className: "bg-green-500" },
  { value: "emerald", label: "Emerald", className: "bg-emerald-500" },
  { value: "blue", label: "Blue", className: "bg-blue-500" },
  { value: "indigo", label: "Indigo", className: "bg-indigo-500" },
  { value: "purple", label: "Purple", className: "bg-purple-500" },
  { value: "pink", label: "Pink", className: "bg-pink-500" },
] as const;

// Reusable Staff Form Component
interface StaffFormProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  errors: Record<string, string>;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  isSubmitting: boolean;
  mode: "create" | "edit";
}

function StaffForm({
  formData,
  setFormData,
  errors,
  showPassword,
  setShowPassword,
  isSubmitting,
  mode,
}: StaffFormProps) {
  const requiresPassword = useMemo(
    () => formData.role === "cashier" || formData.role === "waiter",
    [formData.role],
  );

  const requiresPhone = useMemo(
    () => formData.role === "cashier" || formData.role === "waiter",
    [formData.role],
  );

  const waiterColorLabel = useMemo(() => {
    return (
      STAFF_COLOR_OPTIONS.find((c) => c.value === formData.color)?.label ||
      "No color"
    );
  }, [formData.color]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement> | { name: string; value: string },
  ) => {
    const name = "name" in e ? e.name : e.target.name;
    const value = "value" in e ? e.value : e.target.value;

    // When role changes, clear password and phone if switching to staff role
    if (name === "role") {
      const newRole = value as StaffRole | "";
      const isStaffRole = newRole === "staff";

      setFormData((prev) => ({
        ...prev,
        role: newRole,
        // Clear password and phone when switching to staff role (they become optional)
        ...(isStaffRole && mode === "create"
          ? { password: "", phone: "" }
          : {}),
        ...(newRole !== "waiter" ? { color: "" } : {}),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  return (
    <div className="space-y-4 py-4">
      {/* Role Field - First in create mode */}
      {mode === "create" && (
        <div>
          <Label htmlFor="staff-role">
            Role <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.role}
            onValueChange={(value) => handleChange({ name: "role", value })}
            disabled={isSubmitting}
          >
            <SelectTrigger
              id="staff-role"
              className={cn(
                "mt-2 min-h-[44px]",
                errors.role && "border-red-500",
              )}
            >
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cashier">Cashier</SelectItem>
              <SelectItem value="waiter">Waiter</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-sm text-red-500 mt-1">{errors.role}</p>
          )}
        </div>
      )}

      {/* Role Field - In edit mode */}
      {mode === "edit" && (
        <div>
          <Label htmlFor="staff-role">Role</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => handleChange({ name: "role", value })}
            disabled={isSubmitting}
          >
            <SelectTrigger
              id="staff-role"
              className={cn(
                "mt-2 min-h-[44px]",
                errors.role && "border-red-500",
              )}
            >
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cashier">Cashier</SelectItem>
              <SelectItem value="waiter">Waiter</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-sm text-red-500 mt-1">{errors.role}</p>
          )}
        </div>
      )}

      {/* Name Field - Only in create mode */}
      {mode === "create" && (
        <div>
          <Label htmlFor="staff-name">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="staff-name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter staff member name"
            className={cn("mt-2 min-h-[44px]", errors.name && "border-red-500")}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="text-sm text-red-500 mt-1">{errors.name}</p>
          )}
        </div>
      )}

      {/* Name Display - Only in edit mode (read-only) */}
      {mode === "edit" && (
        <div>
          <Label htmlFor="staff-name-display">Name</Label>
          <Input
            id="staff-name-display"
            type="text"
            value={formData.name}
            disabled
            className="mt-2 min-h-[44px] bg-gray-50 dark:bg-gray-900"
          />
          <p className="text-xs text-gray-500 mt-1">
            Name cannot be changed after creation
          </p>
        </div>
      )}

      {/* Salary Field */}
      <div>
        <Label htmlFor="staff-salary">
          Salary <span className="text-red-500">*</span>
        </Label>
        <Input
          id="staff-salary"
          name="salary"
          type="number"
          step="0.01"
          min="0"
          value={formData.salary}
          onChange={handleChange}
          placeholder="Enter salary amount"
          className={cn("mt-2 min-h-[44px]", errors.salary && "border-red-500")}
          disabled={isSubmitting}
        />
        {errors.salary && (
          <p className="text-sm text-red-500 mt-1">{errors.salary}</p>
        )}
      </div>

      {/* Waiter Color - Optional */}
      {formData.role === "waiter" && (
        <div>
          <Label htmlFor="staff-color">Waiter Color</Label>
          <Select
            value={formData.color || "none"}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                color: value === "none" ? "" : value,
              }))
            }
            disabled={isSubmitting}
          >
            <SelectTrigger id="staff-color" className="mt-2 min-h-[44px]">
              <SelectValue placeholder="Select color">
                <div className="flex items-center gap-2">
                  {formData.color ? (
                    <span
                      className={cn(
                        "h-3 w-3 rounded-full",
                        STAFF_COLOR_OPTIONS.find(
                          (c) => c.value === formData.color,
                        )?.className,
                      )}
                    />
                  ) : (
                    <span className="h-3 w-3 rounded-full border border-border" />
                  )}
                  <span>{waiterColorLabel}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border border-border" />
                  <span>No color</span>
                </div>
              </SelectItem>
              {STAFF_COLOR_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-3 w-3 rounded-full", c.className)} />
                    <span>{c.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Email Field - Only in create mode */}
      {mode === "create" && (
        <div>
          <Label htmlFor="staff-email">
            Email <span className="text-gray-500 text-xs">(Optional)</span>
          </Label>
          <Input
            id="staff-email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email address"
            className={cn(
              "mt-2 min-h-[44px]",
              errors.email && "border-red-500",
            )}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="text-sm text-red-500 mt-1">{errors.email}</p>
          )}
        </div>
      )}

      {/* Email Display - Only in edit mode (read-only) */}
      {mode === "edit" && (
        <div>
          <Label htmlFor="staff-email-display">Email</Label>
          <Input
            id="staff-email-display"
            type="email"
            value={formData.email || "No email"}
            disabled
            className="mt-2 min-h-[44px] bg-gray-50 dark:bg-gray-900"
          />
          <p className="text-xs text-gray-500 mt-1">
            Email cannot be changed after creation
          </p>
        </div>
      )}

      {/* Phone Field - Conditional */}
      <div>
        <Label htmlFor="staff-phone">
          Phone Number{" "}
          {mode === "create" && formData.role ? (
            requiresPhone ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-gray-500 text-xs">(Optional)</span>
            )
          ) : mode === "edit" ? (
            <span className="text-gray-500 text-xs">(Optional)</span>
          ) : (
            <span className="text-gray-500 text-xs">(Select role first)</span>
          )}
        </Label>
        <Input
          id="staff-phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Enter phone number"
          className={cn("mt-2 min-h-[44px]", errors.phone && "border-red-500")}
          disabled={isSubmitting}
        />
        {errors.phone && (
          <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
        )}
        {mode === "create" && formData.role && requiresPhone && (
          <p className="text-xs text-gray-500 mt-1">
            Required for cashier and waiter roles
          </p>
        )}
        {mode === "create" && formData.role === "staff" && (
          <p className="text-xs text-gray-500 mt-1">Optional for staff role</p>
        )}
      </div>

      {/* Password Field - Conditional (only for create mode) */}
      {mode === "create" && (
        <div>
          <Label htmlFor="staff-password">
            Password{" "}
            {formData.role ? (
              requiresPassword ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-gray-500 text-xs">(Optional)</span>
              )
            ) : (
              <span className="text-gray-500 text-xs">(Select role first)</span>
            )}
          </Label>
          <div className="relative">
            <Input
              id="staff-password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              placeholder={
                formData.role
                  ? requiresPassword
                    ? "Enter password (min. 6 characters)"
                    : "Enter password (optional, min. 6 characters if provided)"
                  : "Select role first"
              }
              className={cn(
                "mt-2 min-h-[44px] pr-10",
                errors.password && "border-red-500",
              )}
              disabled={isSubmitting || !formData.role}
            />
            {formData.role && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          {errors.password && (
            <p className="text-sm text-red-500 mt-1">{errors.password}</p>
          )}
          {formData.role && requiresPassword && (
            <p className="text-xs text-gray-500 mt-1">
              Required for cashier and waiter roles
            </p>
          )}
          {formData.role === "staff" && (
            <p className="text-xs text-gray-500 mt-1">
              Optional for staff role
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function StaffManagementPage() {
  // Route protection - Owners and cashiers can access this page
  const auth = useRequireAuth({
    allowedRoles: ["owner", "cashier"],
    redirectTo: "/",
  });

  const shouldSkipApi =
    auth.isChecking ||
    !auth.hydrated ||
    !auth.isAuthenticated ||
    !auth.isAuthorized;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "",
    salary: "",
    color: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // API hooks (must not be conditional)
  const {
    data: staffData,
    isLoading,
    error,
    refetch,
  } = useListStaffQuery(
    {
      role: roleFilter !== "all" ? (roleFilter as StaffRole) : undefined,
      search: searchQuery.trim() || undefined,
    },
    { skip: shouldSkipApi },
  );

  const [createStaff, { isLoading: isCreating }] = useCreateStaffMutation();
  const [updateStaff, { isLoading: isUpdating }] = useUpdateStaffMutation();
  const [deleteStaff] = useDeleteStaffMutation();

  const isSubmitting = isCreating || isUpdating;
  const staff = useMemo(() => staffData?.staff || [], [staffData]);
  const errorMessage =
    error && "data" in error
      ? (error.data as { message?: string })?.message || "An error occurred"
      : null;

  // Determine if password and phone are required based on role
  const requiresPassword = useMemo(
    () => formData.role === "cashier" || formData.role === "waiter",
    [formData.role],
  );

  const requiresPhone = useMemo(
    () => formData.role === "cashier" || formData.role === "waiter",
    [formData.role],
  );

  // Filter staff client-side for search
  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staff;
    const query = searchQuery.toLowerCase();
    return staff.filter((s: Staff) => {
      return (
        s.name?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        s.phone?.toLowerCase().includes(query) ||
        s.role?.toLowerCase().includes(query)
      );
    });
  }, [staff, searchQuery]);

  // Show loading while checking authorization
  if (auth.isChecking || !auth.hydrated) {
    return <Loading fullScreen text="Checking authorization..." size="lg" />;
  }

  // Don't render if not authorized (redirect handled by useRequireAuth)
  if (!auth.isAuthenticated || !auth.isAuthorized) {
    return null;
  }

  const validateForm = (mode: "create" | "edit"): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation - always required
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (formData.name.trim().length > 100) {
      newErrors.name = "Name must be less than 100 characters";
    }

    // Email validation - optional but must be valid if provided
    if (
      formData.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation - required for cashier/waiter, optional for staff
    if (requiresPhone) {
      if (!formData.phone.trim()) {
        newErrors.phone =
          "Phone number is required for cashier and waiter roles";
      } else if (
        !/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(
          formData.phone,
        )
      ) {
        newErrors.phone = "Please enter a valid phone number";
      }
    } else if (formData.phone.trim()) {
      if (
        !/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(
          formData.phone,
        )
      ) {
        newErrors.phone = "Please enter a valid phone number";
      }
    }

    // Password validation - required for cashier/waiter, optional for staff (only in create mode)
    if (mode === "create") {
      if (requiresPassword) {
        if (!formData.password) {
          newErrors.password =
            "Password is required for cashier and waiter roles";
        } else if (formData.password.length < 6) {
          newErrors.password = "Password must be at least 6 characters";
        }
      } else if (formData.password && formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    }

    // Role validation - always required
    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    // Salary validation - always required
    if (!formData.salary.trim()) {
      newErrors.salary = "Salary is required";
    } else {
      const salaryValue = parseFloat(formData.salary);
      if (isNaN(salaryValue) || salaryValue < 0) {
        newErrors.salary =
          "Salary must be a valid number greater than or equal to 0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "",
      salary: "",
      color: "",
    });
    setErrors({});
    setShowPassword(false);
  };

  const handleCreate = async () => {
    if (!validateForm("create")) {
      return;
    }

    try {
      const payload: {
        name: string;
        email?: string;
        phone?: string;
        password?: string;
        role: StaffRole;
        salary: number;
        color?: string;
      } = {
        name: formData.name.trim(),
        role: formData.role as StaffRole,
        salary: parseFloat(formData.salary),
      };

      if (formData.role === "waiter" && formData.color) {
        payload.color = formData.color;
      }

      if (formData.email.trim()) {
        payload.email = formData.email.trim().toLowerCase();
      }

      if (formData.phone.trim()) {
        payload.phone = formData.phone.trim();
      }

      if (formData.password.trim()) {
        payload.password = formData.password;
      }

      const result = await createStaff(payload).unwrap();

      toast.success("Staff member created successfully", {
        description: `${result.data.name} has been added as ${result.data.role}`,
      });

      resetForm();
      setIsCreateOpen(false);
    } catch (error: unknown) {
      console.error("Error creating staff:", error);

      const err = error as {
        status?: number | string;
        data?:
          | string
          | {
              error?: string;
              message?: string;
              details?: Array<{ message?: string; field?: string }>;
            }
          | null
          | undefined;
        message?: string;
      };

      let errorMessage = "Failed to create staff member. Please try again.";
      const fieldErrors: Record<string, string> = {};

      if (typeof err?.data === "string") {
        errorMessage = err.data;
      } else if (err?.data && typeof err.data === "object") {
        if (err.data.details && Array.isArray(err.data.details)) {
          err.data.details.forEach(
            (detail: { message?: string; field?: string }) => {
              if (detail.field && detail.message) {
                fieldErrors[detail.field] = detail.message;
              }
            },
          );
          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            errorMessage = err.data.message || err.data.error || errorMessage;
          } else {
            errorMessage = err.data.message || err.data.error || errorMessage;
          }
        } else {
          errorMessage = err.data.message || err.data.error || errorMessage;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }

      toast.error("Failed to create staff member", {
        description: errorMessage,
      });
    }
  };

  const handleEdit = (id: string) => {
    const staffMember = staff.find((s: Staff) => s._id === id || s.id === id);
    if (staffMember) {
      setEditingStaffId(id);
      setFormData({
        name: staffMember.name || "",
        email: staffMember.email || "",
        phone: staffMember.phone || "",
        password: "", // Don't pre-fill password
        role: staffMember.role || "",
        salary: staffMember.salary?.toString() || "",
        color: staffMember.color || "",
      });
      setIsEditOpen(true);
    }
  };

  const handleUpdate = async () => {
    if (!editingStaffId) {
      toast.error("No staff member selected for editing");
      return;
    }

    if (!validateForm("edit")) {
      return;
    }

    try {
      const updatePayload: {
        phone?: string;
        salary?: number;
        role?: StaffRole;
        color?: string;
      } = {
        salary: parseFloat(formData.salary),
      };

      if (formData.phone.trim()) {
        updatePayload.phone = formData.phone.trim();
      }

      if (formData.role) {
        updatePayload.role = formData.role as StaffRole;
      }

      if (formData.role === "waiter") {
        updatePayload.color = formData.color || "";
      }

      await updateStaff({
        id: editingStaffId,
        data: updatePayload,
      }).unwrap();

      toast.success("Staff member updated successfully");
      resetForm();
      setEditingStaffId(null);
      setIsEditOpen(false);
    } catch (error: unknown) {
      const err = error as {
        data?: { message?: string };
        message?: string;
        status?: number;
      };
      const message =
        err?.data?.message || err?.message || "Failed to update staff member";
      if (err?.status === 404) {
        toast.error("Staff member not found. It may have been deleted.");
        refetch();
      } else {
        toast.error(message);
      }
    }
  };

  const handleCloseEdit = () => {
    resetForm();
    setEditingStaffId(null);
    setIsEditOpen(false);
  };

  const handleDelete = async (id: string) => {
    const staffMember = staff.find((s: Staff) => s._id === id || s.id === id);
    const staffName = staffMember?.name || "this staff member";

    try {
      await deleteStaff(id).unwrap();
      toast.success(`Staff member "${staffName}" deleted successfully`);
    } catch (err: unknown) {
      const error = err as {
        data?: { message?: string };
        message?: string;
        status?: number;
      };
      const message =
        error?.data?.message ||
        error?.message ||
        "Failed to delete staff member";
      if (error?.status === 404) {
        toast.error(
          "Staff member not found. It may have already been deleted.",
        );
        refetch();
      } else {
        toast.error(message);
      }
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div className="flex flex-col gap-3">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            Staff Management
          </h1>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-sm">
            <button className="px-4 py-2 rounded-md text-sm font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm">
              Staff
            </button>
            <Link
              href="/staff-management/salary"
              className="px-4 py-2 rounded-md text-sm font-medium transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Salary
            </Link>
          </div>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          disabled={isLoading}
          className={cn(isLoading ? "spin-in" : "")}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Create Staff
        </Button>
      </header>

      {errorMessage && !isLoading && (
        <ErrorState message={errorMessage} onRetry={() => refetch()} />
      )}

      {/* Search and Filters Container */}
      {!isLoading && !errorMessage && (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-2 rounded-full border bg-white dark:bg-slate-800">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by name, email, phone, or role..."
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

          {/* Role Filter */}
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
          </div>
        </div>
      )}

      {isLoading && <LoadingState message="Loading staff..." />}

      {!isLoading && !errorMessage && filteredStaff.length === 0 && (
        <EmptyState
          message={
            searchQuery || roleFilter !== "all"
              ? "No staff members match your filters."
              : "No staff members found."
          }
          actionLabel="Create Your First Staff Member"
          onAction={() => setIsCreateOpen(true)}
        />
      )}

      {/* Mobile Card View */}
      {!isLoading && !errorMessage && filteredStaff.length > 0 && (
        <div className="lg:hidden space-y-4">
          {filteredStaff.map((staffMember: Staff) => (
            <div
              key={staffMember._id || staffMember.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {staffMember.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {staffMember.email || "No email"}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {staffMember.phone || "No phone"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded capitalize",
                        staffMember.role === "cashier"
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                          : staffMember.role === "waiter"
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
                      )}
                    >
                      {formatRole(staffMember.role)}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {staffMember.salary?.toFixed(2)} Br
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() =>
                      handleEdit(staffMember._id || staffMember.id || "")
                    }
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <DeleteConfirmDialog
                    title="Are you sure?"
                    description="This action cannot be undone. This will permanently delete the staff member"
                    itemName={staffMember.name}
                    onConfirm={() =>
                      handleDelete(staffMember._id || staffMember.id || "")
                    }
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
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Created: {formatDate(staffMember.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Desktop Table View */}
      {!isLoading && !errorMessage && filteredStaff.length > 0 && (
        <div className="hidden lg:flex flex-col flex-1 min-h-0 soft-card overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                <TableRow>
                  <TableHead className="w-auto min-w-[150px] pr-1 py-2">
                    Name
                  </TableHead>
                  <TableHead className="w-auto min-w-[150px] pl-1 pr-1 py-2">
                    Email
                  </TableHead>
                  <TableHead className="w-auto min-w-[120px] pl-1 pr-1 py-2">
                    Phone
                  </TableHead>
                  <TableHead className="w-auto min-w-[100px] pl-1 pr-1 py-2">
                    Role
                  </TableHead>
                  <TableHead className="w-auto min-w-[100px] pl-1 pr-1 py-2">
                    Salary
                  </TableHead>
                  <TableHead className="w-auto min-w-[120px] pl-1 pr-1 py-2">
                    Created At
                  </TableHead>
                  <TableHead className="w-auto min-w-[100px] pl-1 py-2">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((staffMember: Staff) => (
                  <TableRow
                    key={staffMember._id || staffMember.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <TableCell className="font-medium py-1.5 pl-3 pr-0">
                      {staffMember.name}
                    </TableCell>
                    <TableCell className="py-1.5 pl-1 pr-1">
                      {staffMember.email || "-"}
                    </TableCell>
                    <TableCell className="py-1.5 pl-1 pr-1">
                      {staffMember.phone || "-"}
                    </TableCell>
                    <TableCell className="py-1.5 pl-1 pr-1">
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded capitalize",
                          staffMember.role === "cashier"
                            ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                            : staffMember.role === "waiter"
                              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
                        )}
                      >
                        {formatRole(staffMember.role)}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 pl-1 pr-1">
                      {staffMember.salary?.toFixed(2)} Br
                    </TableCell>
                    <TableCell className="py-1.5 pl-1 pr-1">
                      {formatDate(staffMember.createdAt)}
                    </TableCell>
                    <TableCell className="py-1.5 pl-1">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            handleEdit(staffMember._id || staffMember.id || "")
                          }
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <DeleteConfirmDialog
                          title="Are you sure?"
                          description="This action cannot be undone. This will permanently delete the staff member"
                          itemName={staffMember.name}
                          onConfirm={() =>
                            handleDelete(
                              staffMember._id || staffMember.id || "",
                            )
                          }
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
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>Create Staff</DialogTitle>
          </DialogHeader>
          <StaffForm
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            isSubmitting={isSubmitting}
            mode="create"
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
              disabled={isSubmitting}
              className="min-h-[44px] w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Staff"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Modal */}
      <Dialog open={isEditOpen} onOpenChange={handleCloseEdit}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>Edit Staff</DialogTitle>
          </DialogHeader>
          <StaffForm
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            isSubmitting={isSubmitting}
            mode="edit"
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
              disabled={isSubmitting}
              className="min-h-[44px] w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Staff"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
