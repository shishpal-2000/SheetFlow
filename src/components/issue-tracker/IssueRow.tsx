"use client";

import React, { useRef, useState } from "react";
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
import MobileImagePicker from "./MobileImagePicker";

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
  const [showImageOptions, setShowImageOptions] = useState(false);

  const handleImageUploadClick = () => {
    const isMobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    if (isMobile) {
      setShowImageOptions(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
    setShowImageOptions(false);
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
    setShowImageOptions(false);
  };

  const handleOptionsClose = () => {
    setShowImageOptions(false);
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
            className="flex flex-col gap-2"
            onClick={stopPropagation}
            onMouseDown={stopPropagation}
          >
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

            <Button
              variant="outline"
              size="sm"
              onClick={handleImageUploadClick}
              className="w-full"
            >
              <UploadCloud size={16} className="mr-2" />
              Upload Images
            </Button>
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

      <MobileImagePicker
        isOpen={showImageOptions}
        onClose={handleOptionsClose}
        onCameraCapture={handleCameraCapture}
        onGallerySelect={handleFileUpload}
      />
    </>
  );
}
