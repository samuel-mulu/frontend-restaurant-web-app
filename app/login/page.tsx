"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useLoginMutation } from "@/stores/features/auth/authApi";
import { selectIsAuthenticated } from "@/stores/features/auth/authSlice";
import { AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";


export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [login, { isLoading }] = useLoginMutation();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    }

    if (!password) {
      newErrors.password = "Password is required";
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
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/background.jpg")' }}
      >
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="mb-8 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="relative w-24 h-24 mb-4 rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-white">
            <img
              src="/logo1.jpg"
              alt="kandino's kitchen"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">
            kandino's kitchen
          </h1>
          <p className="text-white/80 font-medium mt-1 uppercase tracking-widest text-xs">
            Management System
          </p>
        </div>

        <Card className="w-full max-w-md border-white/20 shadow-2xl backdrop-blur-md bg-white/90">
          <CardHeader className="space-y-1 text-center pb-2">
            <CardTitle className="text-2xl font-bold text-slate-900">Welcome Back</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {errors.general && (
                <div className="p-3 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {errors.general}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-slate-700 font-lato">
                  Phone Number
                </Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
                    className={cn(
                      "h-11 rounded-lg border-slate-200 focus:ring-primary/20 transition-all bg-white/50",
                      errors.phone && "border-red-500 focus:ring-red-500/20"
                    )}
                    autoComplete="tel"
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs font-medium text-red-500 ml-1">
                    {errors.phone}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700 font-lato">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className={cn(
                      "h-11 rounded-lg border-slate-200 focus:ring-primary/20 transition-all bg-white/50 pr-10",
                      errors.password && "border-red-500 focus:ring-red-500/20"
                    )}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs font-medium text-red-500 ml-1">
                    {errors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-lg font-bold text-base shadow-lg shadow-primary/20 active:scale-[0.98] transition-all bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
