"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  User,
  Edit2,
  Lock,
  Loader2,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} from "@/stores/features/auth/authApi";
import { useSelector } from "react-redux";
import { selectUser } from "@/stores/features/auth/authSlice";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

export default function ProfilePage() {
  const user = useSelector(selectUser);
  const { data: profileData, isLoading, error, refetch } = useGetProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  // Form states
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleEditProfile = () => {
    const displayUser =
      profileData?.success && profileData.data ? profileData.data : user;

    if (displayUser) {
      setEditForm({
        name: displayUser.name || "",
        email: displayUser.email || "",
        phone: displayUser.phone || "",
      });
    }
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      const updateData: { name?: string; email?: string; phone?: string } = {
        name: editForm.name.trim(),
      };

      // Only include email if it's provided
      if (editForm.email?.trim()) {
        updateData.email = editForm.email.trim();
      }

      // Only owners can update phone
      if (user?.role === "owner" && editForm.phone?.trim()) {
        updateData.phone = editForm.phone.trim();
      }

      await updateProfile(updateData).unwrap();
      setIsEditDialogOpen(false);
      toast.success("Profile updated successfully");
      refetch();
    } catch (err: unknown) {
      const error = err as {
        data?: { message?: string };
        message?: string;
      };
      const message =
        error?.data?.message || error?.message || "Failed to update profile";
      toast.error(message);
    }
  };

  const handleChangePassword = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setIsPasswordDialogOpen(true);
  };

  const handleSavePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }).unwrap();
      setIsPasswordDialogOpen(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Password changed successfully");
    } catch (err: unknown) {
      const error = err as {
        data?: { message?: string };
        message?: string;
      };
      const message =
        error?.data?.message || error?.message || "Failed to change password";
      toast.error(message);
    }
  };

  const displayUser =
    profileData?.success && profileData.data ? profileData.data : user;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <LoadingState />
      </div>
    );
  }

  if (error || !displayUser) {
    return (
      <div className="container mx-auto p-6">
        <ErrorState
          message="Failed to load profile"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return "N/A";
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const getRoleDisplay = (role?: string) => {
    if (!role) return "N/A";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your account information and settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Information Card */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Your personal account details
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditProfile}
                className="dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Full Name
                </Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-md border dark:border-gray-700">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {displayUser.name || "N/A"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Role
                </Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-md border dark:border-gray-700">
                  <span className="text-gray-900 dark:text-white">
                    {getRoleDisplay(displayUser.role)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Email
                </Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-md border dark:border-gray-700">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {displayUser.email || "Not provided"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Phone Number
                </Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-md border dark:border-gray-700">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {displayUser.phone || "N/A"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Member Since
                </Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-md border dark:border-gray-700">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {formatDate(displayUser.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Lock className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Manage your password and security settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleChangePassword}
              className="dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
            >
              <Lock className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="dark:text-gray-300">
                Full Name *
              </Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="Enter your full name"
                className="dark:bg-gray-900 dark:text-white dark:border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="dark:text-gray-300">
                Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                placeholder="Enter your email"
                className="dark:bg-gray-900 dark:text-white dark:border-gray-700"
              />
            </div>
            {user?.role === "owner" && (
              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="dark:text-gray-300">
                  Phone Number
                </Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  placeholder="Enter your phone number"
                  className="dark:bg-gray-900 dark:text-white dark:border-gray-700"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isUpdating}
              className="dark:bg-primary dark:text-white"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      >
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              Change Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password" className="dark:text-gray-300">
                Current Password *
              </Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value,
                  })
                }
                placeholder="Enter current password"
                className="dark:bg-gray-900 dark:text-white dark:border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="dark:text-gray-300">
                New Password *
              </Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value,
                  })
                }
                placeholder="Enter new password (min. 6 characters)"
                className="dark:bg-gray-900 dark:text-white dark:border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="dark:text-gray-300">
                Confirm New Password *
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value,
                  })
                }
                placeholder="Confirm new password"
                className="dark:bg-gray-900 dark:text-white dark:border-gray-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(false)}
              className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePassword}
              disabled={isChangingPassword}
              className="dark:bg-primary dark:text-white"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
