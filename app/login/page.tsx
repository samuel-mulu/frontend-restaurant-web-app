"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLoginMutation } from "@/stores/features/auth/authApi";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "@/stores/features/auth/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [login, { isLoading }] = useLoginMutation();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    phone?: string;
    password?: string;
    general?: string;
  }>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const callbackUrl = searchParams.get("callbackUrl");
      router.replace(callbackUrl ? decodeURIComponent(callbackUrl) : "/");
    }
  }, [isAuthenticated, router, searchParams]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (phone.trim().length < 10) {
      newErrors.phone = "Phone number must be at least 10 characters";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      const result = await login({ phone: phone.trim(), password }).unwrap();

      if (result.success) {
        toast.success("Login successful", {
          description: "Welcome back!",
        });

        const callbackUrl = searchParams.get("callbackUrl");
        router.replace(callbackUrl ? decodeURIComponent(callbackUrl) : "/");
      }
    } catch (error: unknown) {
      const err = error as {
        data?: { message?: string; details?: Array<{ message?: string }> };
        message?: string;
      };
      const errorMessage =
        err?.data?.message || err?.message || "Login failed. Please try again.";
      const errorDetails = err?.data?.details?.[0]?.message;

      setErrors({
        general: errorDetails || errorMessage,
      });

      toast.error("Login failed", {
        description: errorDetails || errorMessage,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 via-white to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-base">
            Sign in to your restaurant management account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {errors.general}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
                className={errors.phone ? "border-red-500" : ""}
                autoComplete="tel"
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className={errors.password ? "border-red-500" : ""}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-4 space-y-3">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Demo Credentials
              </h3>
              <div className="space-y-2 text-sm">
                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-100 dark:border-blue-900">
                  <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    👤 Owner
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Phone:</span>{" "}
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                      +1234567890
                    </code>
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Password:</span>{" "}
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                      owner123
                    </code>
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-100 dark:border-blue-900">
                  <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    💰 Cashier
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Phone:</span>{" "}
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                      +1234567891
                    </code>
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Password:</span>{" "}
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                      cashier123
                    </code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
