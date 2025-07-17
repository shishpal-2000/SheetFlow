"use client";

import React, { useCallback, useRef, useState } from "react";
import type { Issue, IssueImage } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Camera,
  Copy,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
} from "lucide-react";
import ImagePreview from "./ImagePreview";
import { cn } from "@/lib/utils";

interface IssueRowProps {
  issue: Issue;
  rowIndex: number;
  onDescriptionChange: (id: string, description: string) => void;
  onImagesChange: (id: string, files: FileList | null) => void;
  onRemoveImage: (issueId: string, imageId: string) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  activeCell: { row: number; col: number } | null;
  selectedCells: Set<string>;
  onCellMouseDown: (row: number, col: number, event: React.MouseEvent) => void;
  onCellMouseEnter: (row: number, col: number) => void;
  selectableColIndices: number[];
  draggedRowId: string | null;
  rowDragOverId: string | null;
  onRowDragStart: (issueId: string, event: React.DragEvent) => void;
  onRowDragOver: (event: React.DragEvent) => void;
  onRowDragEnter: (issueId: string) => void;
  onRowDragLeave: (issueId: string) => void;
  onRowDrop: (targetIssueId: string) => void;
  onRowDragEnd: () => void;
  onOpenImageEditor: (issueId: string, image: IssueImage) => void;
}

export default function IssueRow({
  issue,
  rowIndex,
  onDescriptionChange,
  onImagesChange,
  onRemoveImage,
  onCopy,
  onDelete,
  activeCell,
  selectedCells,
  onCellMouseDown,
  onCellMouseEnter,
  selectableColIndices,
  draggedRowId,
  rowDragOverId,
  onRowDragStart,
  onRowDragOver,
  onRowDragEnter,
  onRowDragLeave,
  onRowDrop,
  onRowDragEnd,
  onOpenImageEditor,
}: IssueRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const isMobile =
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  const processFiles = useCallback(
    (files: File[]) => {
      // Filter only image files
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));

      if (imageFiles.length > 0) {
        // Create a FileList-like object
        const dt = new DataTransfer();
        imageFiles.forEach((file) => dt.items.add(file));
        onImagesChange(issue.id, dt.files);
      }
    },
    [issue.id, onImagesChange]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const items = Array.from(e.clipboardData.items);
      const files: File[] = [];

      items.forEach((item) => {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      });

      if (files.length > 0) {
        processFiles(files);
      }
    },
    [processFiles]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if dragged items contain files
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
      setIsDragActive(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only hide if we're leaving the entire drop zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
      setIsDragActive(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if dragged items contain files
    if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragOver(false);
      setIsDragActive(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [processFiles]
  );

  const handleImageUploadClick = () => {
    if (!isMobile) {
      fileInputRef.current?.click();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCameraCapture = async () => {
    // Check if camera is available
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        // Request camera permission
        await navigator.mediaDevices.getUserMedia({ video: true });
        cameraInputRef.current?.click();
      } catch (error) {
        console.error("Camera access denied:", error);
        // Fallback to file input
        fileInputRef.current?.click();
      }
    } else {
      // Fallback for older browsers
      cameraInputRef.current?.click();
    }
  };

  const getCellClasses = (colIndex: number) => {
    const isSelected = selectedCells.has(`${rowIndex}-${colIndex}`);
    const isActive =
      activeCell?.row === rowIndex &&
      activeCell?.col === colIndex &&
      selectableColIndices.includes(colIndex);
    return cn(
      "relative",
      isSelected && selectableColIndices.includes(colIndex) && "bg-primary/10",
      isActive && "ring-2 ring-inset ring-primary z-10"
    );
  };

  const stopPropagation = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) {
      e.stopPropagation();
    }
  };

  const isBeingDragged = issue.id === draggedRowId;
  const isDragOverTarget =
    issue.id === rowDragOverId &&
    draggedRowId !== null &&
    issue.id !== draggedRowId;

  return (
    <>
      <TableRow
        className={cn(
          "transition-all duration-100 ease-in-out",
          isBeingDragged && "opacity-30",
          isDragOverTarget && "border-t-2 border-primary border-dashed"
        )}
        data-row-index={rowIndex}
        onDragOver={onRowDragOver}
        onDrop={(e) => {
          e.preventDefault();
          onRowDrop(issue.id);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          onRowDragEnter(issue.id);
        }}
        onDragLeave={() => onRowDragLeave(issue.id)}
      >
        <TableCell
          className={cn(
            "w-16 text-center align-top pt-4 cursor-grab hover:bg-muted/50 transition-colors",
            getCellClasses(0)
          )}
          onMouseDown={(e) => onCellMouseDown(rowIndex, 0, e)}
          onMouseEnter={() => onCellMouseEnter(rowIndex, 0)}
          draggable={true}
          onDragStart={(e) => onRowDragStart(issue.id, e)}
          onDragEnd={onRowDragEnd}
        >
          {rowIndex + 1}
        </TableCell>
        <TableCell
          className={cn("align-top min-w-[200px]", getCellClasses(1))}
          onMouseDown={(e) => onCellMouseDown(rowIndex, 1, e)}
          onMouseEnter={() => onCellMouseEnter(rowIndex, 1)}
        >
          <Textarea
            value={issue.description}
            onChange={(e) => onDescriptionChange(issue.id, e.target.value)}
            placeholder="Enter issue description"
            className="h-full resize-y bg-card"
            onMouseDown={(e) => {
              onCellMouseDown(rowIndex, 1, e);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </TableCell>
        <TableCell
          className={cn("align-top min-w-[300px]", getCellClasses(2))}
          onMouseDown={(e) => onCellMouseDown(rowIndex, 2, e)}
          onMouseEnter={() => onCellMouseEnter(rowIndex, 2)}
        >
          <div
            className={cn(
              "flex flex-col gap-2 p-2 rounded-lg transition-all duration-200",
              "focus-within:outline-none",
              isDragOver &&
                "bg-primary/10 border-2 border-primary border-dashed",
              !isDragOver && "border-2 border-transparent"
            )}
            onClick={stopPropagation}
            onMouseDown={stopPropagation}
            onPaste={handlePaste}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            tabIndex={0}
          >
            {isDragActive && (
              <div className="absolute inset-0 bg-primary/5 border-2 border-primary border-dashed rounded-lg flex items-center justify-center z-10">
                <div className="text-primary font-medium text-sm">
                  Drop images here
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {issue.images.map((img) => (
                <ImagePreview
                  key={img.id}
                  image={img}
                  onRemove={(imageId) => onRemoveImage(issue.id, imageId)}
                  onOpenImageEditor={() => onOpenImageEditor(issue.id, img)}
                />
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {isMobile ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFileUpload}
                    className="flex-1"
                  >
                    <UploadCloud size={16} className="mr-2" />
                    Upload Images
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCameraCapture}
                    className="px-3"
                    aria-label="Take photo"
                  >
                    <Camera size={16} />
                  </Button>
                </div>
              ) : (
                /* Desktop: Show only upload button */
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleImageUploadClick}
                  className="w-full"
                >
                  <UploadCloud size={16} className="mr-2" />
                  Upload Images
                </Button>
              )}

              {/* ✅ Add hint text for drag and drop + paste */}
              <div className="text-xs text-muted-foreground text-center">
                Or drag & drop images, or paste from clipboard
              </div>
            </div>

            <input
              type="file"
              multiple
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => onImagesChange(issue.id, e.target.files)}
            />

            {/* camera input for photo capture */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              className="hidden"
              onChange={(e) => onImagesChange(issue.id, e.target.files)}
            />
          </div>
        </TableCell>
        <TableCell
          className={cn("w-32 text-center align-top pt-4", getCellClasses(3))}
          onMouseDown={(e) => onCellMouseDown(rowIndex, 3, e)}
          onMouseEnter={() => onCellMouseEnter(rowIndex, 3)}
        >
          <div
            className="flex flex-col items-center gap-1.5"
            onClick={stopPropagation}
            onMouseDown={stopPropagation}
          >
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onCopy(issue.id)}
                aria-label="Copy issue"
                className="h-8 w-8"
              >
                <Copy size={16} />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => onDelete(issue.id)}
                aria-label="Delete issue"
                className="h-8 w-8"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        </TableCell>
      </TableRow>

      {/* <MobileImagePicker
        isOpen={showImageOptions}
        onClose={handleOptionsClose}
        onCameraCapture={handleCameraCapture}
        onGallerySelect={handleFileUpload}
      /> */}
    </>
  );
}
