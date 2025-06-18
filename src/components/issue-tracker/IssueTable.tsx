
"use client";

import type { Issue, IssueImage } from "@/types";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import IssueRow from "./IssueRow";
import React from "react";
import { cn } from "@/lib/utils";

interface IssueTableProps {
  issues: Issue[];
  onDescriptionChange: (id: string, description: string) => void;
  onImagesChange: (id: string, files: FileList | null) => void;
  onRemoveImage: (issueId: string, imageId: string) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  activeCell: { row: number; col: number } | null;
  selectedCells: Set<string>;
  tableContainerRef: React.RefObject<HTMLDivElement>;
  onCellMouseDown: (row: number, col: number, event: React.MouseEvent) => void;
  onCellMouseEnter: (row: number, col: number) => void;
  onTableKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  selectableColIndices: number[];
  onColumnHeaderClick: (colIndex: number) => void;
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

export default function IssueTable({
  issues,
  onDescriptionChange,
  onImagesChange,
  onRemoveImage,
  onCopy,
  onDelete,
  activeCell,
  selectedCells,
  tableContainerRef,
  onCellMouseDown,
  onCellMouseEnter,
  onTableKeyDown,
  selectableColIndices,
  onColumnHeaderClick,
  draggedRowId,
  rowDragOverId,
  onRowDragStart,
  onRowDragOver,
  onRowDragEnter,
  onRowDragLeave,
  onRowDrop,
  onRowDragEnd,
  onOpenImageEditor,
}: IssueTableProps) {
  if (issues.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        No issues yet. Click "Add New Issue" to get started.
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border shadow-sm overflow-hidden bg-card"
      ref={tableContainerRef}
      tabIndex={0}
      onKeyDown={onTableKeyDown}
      style={{ outline: 'none' }}
    >
      <Table
        className="select-none"
      >
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-center font-headline text-base">S/N</TableHead>
            <TableHead
              className={cn(
                "font-headline text-base",
                selectableColIndices.includes(1) && "cursor-pointer hover:bg-muted/50 transition-colors"
              )}
              onClick={() => selectableColIndices.includes(1) && onColumnHeaderClick(1)}
            >
              Issue
            </TableHead>
            <TableHead
              className={cn(
                "font-headline text-base",
                selectableColIndices.includes(2) && "cursor-pointer hover:bg-muted/50 transition-colors"
              )}
              onClick={() => selectableColIndices.includes(2) && onColumnHeaderClick(2)}
            >
              Images
            </TableHead>
            <TableHead className="w-32 text-center font-headline text-base">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((issue, index) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              rowIndex={index}
              onDescriptionChange={onDescriptionChange}
              onImagesChange={onImagesChange}
              onRemoveImage={onRemoveImage}
              onCopy={onCopy}
              onDelete={onDelete}
              activeCell={activeCell}
              selectedCells={selectedCells}
              onCellMouseDown={onCellMouseDown}
              onCellMouseEnter={onCellMouseEnter}
              selectableColIndices={selectableColIndices}
              draggedRowId={draggedRowId}
              rowDragOverId={rowDragOverId}
              onRowDragStart={onRowDragStart}
              onRowDragOver={onRowDragOver}
              onRowDragEnter={onRowDragEnter}
              onRowDragLeave={onRowDragLeave}
              onRowDrop={onRowDrop}
              onRowDragEnd={onRowDragEnd}
              onOpenImageEditor={onOpenImageEditor}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
