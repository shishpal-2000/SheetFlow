// Create a new component: MobileImagePicker.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, X } from "lucide-react";

interface MobileImagePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onCameraCapture: () => void;
  onGallerySelect: () => void;
}

export default function MobileImagePicker({
  isOpen,
  onClose,
  onCameraCapture,
  onGallerySelect,
}: MobileImagePickerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center md:hidden">
      <div className="bg-white rounded-t-lg w-full max-w-md p-4 space-y-3 animate-in slide-in-from-bottom duration-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Add Images</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={onCameraCapture}
            className="w-full justify-start gap-3 h-12"
          >
            <Camera size={20} />
            Take Photo
          </Button>

          <Button
            variant="outline"
            onClick={onGallerySelect}
            className="w-full justify-start gap-3 h-12"
          >
            <ImageIcon size={20} />
            Choose from Gallery
          </Button>
        </div>

        <Button variant="ghost" onClick={onClose} className="w-full">
          Cancel
        </Button>
      </div>
    </div>
  );
}
