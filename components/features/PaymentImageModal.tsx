"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Building2, Camera, Image as ImageIcon, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

interface PaymentImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (file: File | null, bankName?: string) => void;
  orderNumber?: string;
}

export function PaymentImageModal({
  open,
  onOpenChange,
  onConfirm,
  orderNumber,
}: PaymentImageModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [customBankName, setCustomBankName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const handleConfirm = () => {
    const bankName = selectedBank === "others" ? customBankName : selectedBank;
    onConfirm(imageFile, bankName || undefined);
    handleClose();
  };

  const handleClose = () => {
    setImageFile(null);
    setImagePreview(null);
    setSelectedBank("");
    setCustomBankName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Mobile Banking Payment</DialogTitle>
          <DialogDescription>
            {orderNumber
              ? `Update payment details for order ${orderNumber}`
              : "Enter payment details for mobile banking payment"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Select Bank (Optional)
            </Label>
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a bank..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CBE">CBE (Commercial Bank of Ethiopia)</SelectItem>
                <SelectItem value="Telebirr">Telebirr</SelectItem>
                <SelectItem value="others">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedBank === "others" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <Label>Bank Name</Label>
              <Input
                placeholder="Enter bank name manually..."
                value={customBankName}
                onChange={(e) => setCustomBankName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Payment Proof Image (Optional)
            </Label>
            {!imagePreview ? (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUploadClick}
                    className="flex-1"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload from File
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCameraClick}
                    className="flex-1"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Take Photo
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative rounded-lg border border-border overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Payment proof preview"
                    className="w-full h-auto max-h-[300px] object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemove}
                    className="absolute top-2 right-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  <span>{imageFile?.name}</span>
                  <span className="text-xs">
                    ({((imageFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
