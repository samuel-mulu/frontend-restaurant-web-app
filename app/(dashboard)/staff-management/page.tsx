"use client";

import React, { useState } from "react";
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
import { useCreateStaffMutation } from "@/stores/features/staff/staffApi";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus } from "lucide-react";

export default function StaffManagementPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "" as "cashier" | "waiter" | "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [createStaff, { isLoading: isCreating }] = useCreateStaffMutation();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (
      !/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(
        formData.phone
      )
    ) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const result = await createStaff({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role as "cashier" | "waiter",
      }).unwrap();

      toast.success("Staff member created successfully", {
        description: `${result.data.name} has been added as ${result.data.role}`,
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "",
      });
      setErrors({});
    } catch (error: unknown) {
      console.error("Error creating staff:", error);

      const err = error as {
        status?: number | string;
        data?:
          | string
          | { error?: string; message?: string; details?: Array<{ message?: string; field?: string }> }
          | null
          | undefined;
        message?: string;
      };

      let errorMessage = "Failed to create staff member. Please try again.";

      if (typeof err?.data === "string") {
        errorMessage = err.data;
      } else if (err?.data && typeof err.data === "object") {
        if (err.data.details && Array.isArray(err.data.details)) {
          const fieldErrors: Record<string, string> = {};
          err.data.details.forEach((detail: { message?: string; field?: string }) => {
            if (detail.field && detail.message) {
              fieldErrors[detail.field] = detail.message;
            }
          });
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement> | { name: string; value: string }
  ) => {
    const name = "name" in e ? e.name : e.target.name;
    const value = "value" in e ? e.value : e.target.value;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <UserPlus className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
          Staff Management
        </h1>
      </header>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter staff member name"
              className={errors.name ? "border-red-500" : ""}
              disabled={isCreating}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
              className={errors.email ? "border-red-500" : ""}
              disabled={isCreating}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              className={errors.phone ? "border-red-500" : ""}
              disabled={isCreating}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password (min. 6 characters)"
                className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                disabled={isCreating}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                disabled={isCreating}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium">
              Role <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) =>
                handleChange({ name: "role", value })
              }
              disabled={isCreating}
            >
              <SelectTrigger
                id="role"
                className={errors.role ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cashier">Cashier</SelectItem>
                <SelectItem value="waiter">Waiter</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={isCreating}
              className="min-w-[120px]"
            >
              {isCreating ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Staff
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

