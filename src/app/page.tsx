"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Issue, IssueImage } from "@/types";
import IssueTable from "@/components/issue-tracker/IssueTable";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import dynamic from "next/dynamic";
const ImageEditorModal = dynamic(
  () => import("../components/image-editor/ImageEditorModal"),
  {
    ssr: false,
    loading: () => <div>Loading Text Editor...</div>,
  }
);
import { v4 as uuidv4 } from "uuid";

const SELECTABLE_COL_INDICES = [1, 2]; // Column indices for "Description" and "Images"
const MIN_SELECTABLE_COL = SELECTABLE_COL_INDICES[0];
const MAX_SELECTABLE_COL =
  SELECTABLE_COL_INDICES[SELECTABLE_COL_INDICES.length - 1]; // This is the Images column

type ClipboardCellData = string | Pick<IssueImage, "url" | "name">[] | null;
type InternalClipboardData = Array<Array<ClipboardCellData>>;

export default function IssueTrackerPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  const [activeCell, setActiveCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set()); // "row-col"
  const [isDragging, setIsDragging] = useState(false);
  const [selectionAnchor, setSelectionAnchor] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [internalClipboard, setInternalClipboard] =
    useState<InternalClipboardData | null>(null);

  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [rowDragOverId, setRowDragOverId] = useState<string | null>(null);

  // State for Image Editor Modal
  const [editingImageInfo, setEditingImageInfo] = useState<{
    issueId: string;
    image: IssueImage;
  } | null>(null);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedIssues = localStorage.getItem("issues");
    if (storedIssues) {
      try {
        const parsedIssues: Omit<Issue, "images"> &
          { images: Omit<IssueImage, "file">[] }[] = JSON.parse(storedIssues);
        setIssues(
          parsedIssues.map((issue: any) => ({
            ...issue,
            images: issue.images.map((img: any) => ({
              ...img,
              file: new File([], img.name || "image.png", {
                type: img.url.match(/data:(image\/\w+);/)?.[1] || "image/png",
              }),
            })),
          }))
        );
      } catch (error) {
        console.error("Failed to parse issues from localStorage", error);
        setIssues([]);
      }
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      const issuesToStore = issues.map((issue) => ({
        ...issue,
        images: issue.images.map(({ file, ...imgData }) => imgData), // Don't store actual File objects
      }));
      localStorage.setItem("issues", JSON.stringify(issuesToStore));
    }
  }, [issues, isClient]);

  const copySelectedCellsToInternalClipboard = useCallback(() => {
    if (selectedCells.size === 0) return;

    let minRow = Infinity,
      maxRow = -Infinity;
    let minColActual = Infinity,
      maxColActual = -Infinity;

    selectedCells.forEach((cellString) => {
      const [r, c] = cellString.split("-").map(Number);
      minRow = Math.min(minRow, r);
      maxRow = Math.max(maxRow, r);
      if (SELECTABLE_COL_INDICES.includes(c)) {
        minColActual = Math.min(minColActual, c);
        maxColActual = Math.max(maxColActual, c);
      }
    });

    const selectedColsInOrder = SELECTABLE_COL_INDICES.filter(
      (c) => c >= minColActual && c <= maxColActual
    );

    const clipboardData: InternalClipboardData = [];
    for (let r = minRow; r <= maxRow; r++) {
      const rowData: Array<ClipboardCellData> = [];
      const currentIssue = issues[r];
      if (!currentIssue) continue;

      for (const colIndex of selectedColsInOrder) {
        if (selectedCells.has(`${r}-${colIndex}`)) {
          if (colIndex === SELECTABLE_COL_INDICES[0]) {
            rowData.push(currentIssue.description);
          } else if (colIndex === SELECTABLE_COL_INDICES[1]) {
            rowData.push(
              currentIssue.images.map((img) => ({
                url: img.url,
                name: img.name,
              }))
            );
          } else {
            rowData.push(null);
          }
        } else {
          rowData.push(null);
        }
      }
      clipboardData.push(rowData);
    }
    setInternalClipboard(clipboardData);
    toast({
      title: "Selection Copied",
      description: `${
        clipboardData.flat().filter((c) => c !== null).length
      } cell(s) copied to clipboard.`,
    });
  }, [selectedCells, issues, toast]);

  const pasteFromInternalClipboard = useCallback(() => {
    if (!internalClipboard || !activeCell) return;

    let newIssues = [...issues];
    const startRow = activeCell.row;
    const activeCellSelectableIndex = SELECTABLE_COL_INDICES.indexOf(
      activeCell.col
    );

    if (activeCellSelectableIndex === -1) {
      toast({
        title: "Paste Error",
        description: "Cannot paste starting from this cell.",
        variant: "destructive",
      });
      return;
    }

    internalClipboard.forEach((clipboardRow, deltaRow) => {
      const targetRowIndex = startRow + deltaRow;

      while (targetRowIndex >= newIssues.length) {
        newIssues.push({
          id: uuidv4(),
          description: "",
          images: [],
        });
      }

      let targetIssue = { ...newIssues[targetRowIndex] };

      clipboardRow.forEach((cellData, deltaColInClipboard) => {
        if (cellData === null) return;

        const targetColSelectableArrayIndex =
          activeCellSelectableIndex + deltaColInClipboard;
        if (targetColSelectableArrayIndex >= SELECTABLE_COL_INDICES.length)
          return;

        const actualTargetCol =
          SELECTABLE_COL_INDICES[targetColSelectableArrayIndex];

        if (actualTargetCol === SELECTABLE_COL_INDICES[0]) {
          // Target is Description column
          if (typeof cellData === "string") {
            targetIssue.description = cellData;
          } else {
            // Do not paste non-string data into description
          }
        } else if (actualTargetCol === SELECTABLE_COL_INDICES[1]) {
          // Target is Images column
          if (
            Array.isArray(cellData) &&
            (cellData.length === 0 ||
              (cellData.length > 0 &&
                typeof cellData[0] === "object" &&
                cellData[0] !== null &&
                "url" in cellData[0] &&
                "name" in cellData[0]))
          ) {
            const imagesToPaste = cellData as Pick<
              IssueImage,
              "url" | "name"
            >[];
            if (imagesToPaste.length > 0) {
              const newImagesForCell: IssueImage[] = imagesToPaste.map(
                (imgData) => ({
                  id: uuidv4(),
                  url: imgData.url,
                  name: imgData.name,
                  file: new File([], imgData.name, {
                    type:
                      imgData.url.match(/data:(image\/\w+);/)?.[1] ||
                      "image/png",
                  }),
                })
              );
              targetIssue.images = [
                ...(targetIssue.images || []),
                ...newImagesForCell,
              ];
            }
          } else {
            // Do not paste non-image-array data into images
          }
        }
      });
      newIssues[targetRowIndex] = targetIssue;
    });

    setIssues(newIssues);
    toast({
      title: "Pasted",
      description: "Content pasted from internal clipboard.",
    });
  }, [internalClipboard, activeCell, issues, toast]);

  useEffect(() => {
    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (
        !tableContainerRef.current ||
        !document.activeElement ||
        !tableContainerRef.current.contains(document.activeElement)
      ) {
        // If focus is not within the table, or table isn't focused, don't interfere with global shortcuts
      }

      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === "c") {
          if (
            selectedCells.size > 0 &&
            tableContainerRef.current?.contains(document.activeElement)
          ) {
            copySelectedCellsToInternalClipboard();
            event.preventDefault();
          }
        } else if (event.key.toLowerCase() === "v") {
          if (
            internalClipboard &&
            activeCell &&
            tableContainerRef.current?.contains(document.activeElement)
          ) {
            pasteFromInternalClipboard();
            event.preventDefault();
          }
        }
      }
    };
    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [
    selectedCells,
    copySelectedCellsToInternalClipboard,
    internalClipboard,
    activeCell,
    pasteFromInternalClipboard,
  ]);

  const updateSelectedCellsRange = useCallback(
    (
      start: { row: number; col: number },
      end: { row: number; col: number }
    ) => {
      const newSelectedCells = new Set<string>();
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);
      const minColOverall = Math.min(start.col, end.col);
      const maxColOverall = Math.max(start.col, end.col);

      for (let r = minRow; r <= maxRow; r++) {
        for (let c of SELECTABLE_COL_INDICES) {
          if (c >= minColOverall && c <= maxColOverall) {
            newSelectedCells.add(`${r}-${c}`);
          }
        }
      }
      setSelectedCells(newSelectedCells);
    },
    []
  );

  const handleCellMouseDown = useCallback(
    (row: number, col: number, event: React.MouseEvent) => {
      tableContainerRef.current?.focus();

      if (col === 0) {
        // Click on S/N column for row selection
        setIsDragging(false);
        const newSelectedCells = new Set<string>();
        SELECTABLE_COL_INDICES.forEach((c) => {
          newSelectedCells.add(`${row}-${c}`);
        });
        setSelectedCells(newSelectedCells);
        const newActive = { row, col: MIN_SELECTABLE_COL };
        setActiveCell(newActive);
        setSelectionAnchor(newActive);
        return;
      }

      if (!SELECTABLE_COL_INDICES.includes(col)) {
        setIsDragging(false);
        return;
      }

      setIsDragging(true);
      setActiveCell({ row, col });

      if (event.shiftKey && selectionAnchor) {
        const effectiveAnchor = SELECTABLE_COL_INDICES.includes(
          selectionAnchor.col
        )
          ? selectionAnchor
          : { ...selectionAnchor, col: MIN_SELECTABLE_COL };
        updateSelectedCellsRange(effectiveAnchor, { row, col });
      } else {
        setSelectedCells(new Set([`${row}-${col}`]));
        setSelectionAnchor({ row, col });
      }
    },
    [selectionAnchor, updateSelectedCellsRange]
  );

  const handleCellMouseEnter = useCallback(
    (row: number, col: number) => {
      if (isDragging && selectionAnchor) {
        if (SELECTABLE_COL_INDICES.includes(col)) {
          setActiveCell({ row, col });
          updateSelectedCellsRange(selectionAnchor, { row, col });
        }
      }
    },
    [isDragging, selectionAnchor, updateSelectedCellsRange]
  );

  const handleTableMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const handleMouseUpGlobal = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };
    window.addEventListener("mouseup", handleMouseUpGlobal);
    return () => {
      window.removeEventListener("mouseup", handleMouseUpGlobal);
    };
  }, [isDragging]);

  const handleTableKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key.toLowerCase() === "c" || event.key.toLowerCase() === "v")
      ) {
        return;
      }
      if (!activeCell && issues.length > 0) {
        if (
          event.key.startsWith("Arrow") ||
          event.key === "Enter" ||
          event.key === "Tab"
        ) {
          const initialCell = { row: 0, col: MIN_SELECTABLE_COL };
          setActiveCell(initialCell);
          setSelectedCells(new Set([`${initialCell.row}-${initialCell.col}`]));
          setSelectionAnchor(initialCell);
          if (event.key.startsWith("Arrow")) event.preventDefault();
          return;
        }
      }
      if (!activeCell) return;

      let { row, col } = activeCell;
      if (!SELECTABLE_COL_INDICES.includes(col)) {
        col = MIN_SELECTABLE_COL;
      }

      let newActiveRow = row;
      let newActiveCol = col;

      switch (event.key) {
        case "ArrowUp":
          newActiveRow = Math.max(0, row - 1);
          event.preventDefault();
          break;
        case "ArrowDown":
          newActiveRow = Math.min(issues.length - 1, row + 1);
          event.preventDefault();
          break;
        case "ArrowLeft":
          event.preventDefault();
          if (col === MIN_SELECTABLE_COL) {
            if (row > 0) {
              newActiveRow = row - 1;
              newActiveCol = MAX_SELECTABLE_COL;
            }
          } else {
            const currentIndex = SELECTABLE_COL_INDICES.indexOf(col);
            newActiveCol =
              SELECTABLE_COL_INDICES[Math.max(0, currentIndex - 1)];
          }
          break;
        case "ArrowRight":
          event.preventDefault();
          if (col === MAX_SELECTABLE_COL) {
            if (row < issues.length - 1) {
              newActiveRow = row + 1;
              newActiveCol = MIN_SELECTABLE_COL;
            }
          } else {
            const currentIndex = SELECTABLE_COL_INDICES.indexOf(col);
            newActiveCol =
              SELECTABLE_COL_INDICES[
                Math.min(SELECTABLE_COL_INDICES.length - 1, currentIndex + 1)
              ];
          }
          break;
        case "Tab":
          event.preventDefault();
          if (event.shiftKey) {
            if (col === MIN_SELECTABLE_COL) {
              if (row > 0) {
                newActiveRow = row - 1;
                newActiveCol = MAX_SELECTABLE_COL;
              } else {
                newActiveCol = MIN_SELECTABLE_COL;
              }
            } else {
              const currentIndex = SELECTABLE_COL_INDICES.indexOf(col);
              newActiveCol =
                SELECTABLE_COL_INDICES[Math.max(0, currentIndex - 1)];
            }
          } else {
            if (col === MAX_SELECTABLE_COL) {
              if (row < issues.length - 1) {
                newActiveRow = row + 1;
                newActiveCol = MIN_SELECTABLE_COL;
              } else {
                newActiveCol = MAX_SELECTABLE_COL;
              }
            } else {
              const currentIndex = SELECTABLE_COL_INDICES.indexOf(col);
              newActiveCol =
                SELECTABLE_COL_INDICES[
                  Math.min(SELECTABLE_COL_INDICES.length - 1, currentIndex + 1)
                ];
            }
          }
          break;
        case "Escape":
          setSelectedCells(new Set());
          setSelectionAnchor(null);
          setInternalClipboard(null);
          event.preventDefault();
          return;
        default:
          return;
      }

      const newActiveCellCandidate = { row: newActiveRow, col: newActiveCol };
      setActiveCell(newActiveCellCandidate);

      if (event.shiftKey && selectionAnchor) {
        updateSelectedCellsRange(selectionAnchor, newActiveCellCandidate);
      } else {
        setSelectedCells(new Set([`${newActiveRow}-${newActiveCol}`]));
        setSelectionAnchor(newActiveCellCandidate);
      }
    },
    [
      activeCell,
      issues.length,
      selectionAnchor,
      updateSelectedCellsRange,
      internalClipboard,
    ]
  );

  const handleColumnHeaderClick = useCallback(
    (colIndex: number) => {
      if (!SELECTABLE_COL_INDICES.includes(colIndex) || issues.length === 0) {
        return;
      }
      tableContainerRef.current?.focus();
      setIsDragging(false);
      const newSelectedCells = new Set<string>();
      for (let r = 0; r < issues.length; r++) {
        newSelectedCells.add(`${r}-${colIndex}`);
      }
      setSelectedCells(newSelectedCells);
      const newActive = { row: 0, col: colIndex };
      setActiveCell(newActive);
      setSelectionAnchor(newActive);
    },
    [issues.length]
  );

  const handleAddNewIssue = () => {
    const newIssue: Issue = {
      id: uuidv4(),
      description: "",
      images: [],
    };
    setIssues((prevIssues) => [...prevIssues, newIssue]);
    toast({
      title: "New issue added",
      description: "An empty issue row has been created.",
    });

    const newRowIndex = issues.length;
    const newActive = { row: newRowIndex, col: MIN_SELECTABLE_COL };
    setActiveCell(newActive);
    setSelectedCells(new Set([`${newActive.row}-${newActive.col}`]));
    setSelectionAnchor(newActive);

    setTimeout(() => {
      tableContainerRef.current?.focus();
      const rowElement = tableContainerRef.current?.querySelector(
        `[data-row-index="${newRowIndex}"]`
      );
      rowElement?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
  };

  const handleDescriptionChange = (id: string, description: string) => {
    setIssues((prevIssues) =>
      prevIssues.map((issue) =>
        issue.id === id ? { ...issue, description } : issue
      )
    );
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImagesChange = async (id: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      const newImagePromises = Array.from(files).map(async (file) => {
        const url = await fileToDataUrl(file);
        return {
          id: uuidv4(),
          url,
          file,
          name: file.name,
        };
      });

      const newImages = await Promise.all(newImagePromises);

      setIssues((prevIssues) =>
        prevIssues.map((issue) =>
          issue.id === id
            ? { ...issue, images: [...issue.images, ...newImages] }
            : issue
        )
      );
      toast({
        title: "Images uploaded",
        description: `${newImages.length} image(s) added to the issue.`,
      });
    } catch (error) {
      console.error("Error converting files to data URLs:", error);
      toast({
        title: "Image Upload Error",
        description: "Could not process image files.",
        variant: "destructive",
      });
    }
  };

  const addSingleImageToIssue = useCallback(
    async (issueId: string, imageFile: File) => {
      try {
        const url = await fileToDataUrl(imageFile);
        const newImage: IssueImage = {
          id: uuidv4(),
          url,
          file: imageFile,
          name:
            imageFile.name &&
            imageFile.name !== "image.png" &&
            imageFile.name !== ""
              ? imageFile.name
              : `pasted-${Date.now()}.${imageFile.type.split("/")[1] || "png"}`,
        };

        setIssues((prevIssues) =>
          prevIssues.map((issue) =>
            issue.id === issueId
              ? { ...issue, images: [...issue.images, newImage] }
              : issue
          )
        );
        toast({
          title: "Image pasted",
          description: `Image "${newImage.name}" added to the issue.`,
        });
      } catch (error) {
        console.error("Error converting pasted image to data URL:", error);
        toast({
          title: "Image Paste Error",
          description: "Could not process pasted image.",
          variant: "destructive",
        });
      }
    },
    [setIssues, toast]
  );

  useEffect(() => {
    const handleDirectPaste = (event: any) => {
      if (internalClipboard && (event.ctrlKey || event.metaKey)) {
        return;
      }
      if (!activeCell || activeCell.col !== MAX_SELECTABLE_COL) {
        return;
      }
      if (activeCell.row < 0 || activeCell.row >= issues.length) {
        return;
      }

      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const issueId = issues[activeCell.row].id;
            addSingleImageToIssue(issueId, blob);
            event.preventDefault();
            return;
          }
        }
      }
    };
    document.addEventListener("paste", handleDirectPaste);
    return () => {
      document.removeEventListener("paste", handleDirectPaste);
    };
  }, [activeCell, issues, addSingleImageToIssue, internalClipboard]);

  const handleRemoveImage = (issueId: string, imageId: string) => {
    setIssues((prevIssues) =>
      prevIssues.map((issue) => {
        if (issue.id === issueId) {
          return {
            ...issue,
            images: issue.images.filter((img) => img.id !== imageId),
          };
        }
        return issue;
      })
    );
    toast({ title: "Image removed", variant: "destructive" });
  };

  const handleCopy = (id: string) => {
    setIssues((prevIssues) => {
      const issueToCopy = prevIssues.find((issue) => issue.id === id);
      if (!issueToCopy) return prevIssues;
      const newIssue: Issue = {
        ...issueToCopy,
        id: uuidv4(),
        images: issueToCopy.images.map((img) => ({
          ...img,
          id: uuidv4(),
          file: new File([], img.name, {
            type: img.url.match(/data:(image\/\w+);/)?.[1] || "image/png",
          }),
        })),
      };

      const index = prevIssues.findIndex((issue) => issue.id === id);
      const newIssues = [...prevIssues];
      newIssues.splice(index + 1, 0, newIssue);
      return newIssues;
    });
    toast({
      title: "Issue copied",
      description: "The issue has been duplicated.",
    });
  };

  const handleDelete = (id: string) => {
    setIssues((prevIssues) => {
      const deletedRowIndex = prevIssues.findIndex((issue) => issue.id === id);
      const newIssues = prevIssues.filter((issue) => issue.id !== id);

      if (activeCell && activeCell.row === deletedRowIndex) {
        if (newIssues.length === 0) {
          setActiveCell(null);
          setSelectedCells(new Set());
          setSelectionAnchor(null);
        } else if (deletedRowIndex >= newIssues.length) {
          const newActiveRow = Math.max(0, newIssues.length - 1);
          const newActive = { row: newActiveRow, col: activeCell.col };
          setActiveCell(newActive);
          setSelectedCells(new Set([`${newActive.row}-${newActive.col}`]));
          setSelectionAnchor(newActive);
        }
      } else if (activeCell && activeCell.row > deletedRowIndex) {
        const newActive = { ...activeCell, row: activeCell.row - 1 };
        setActiveCell(newActive);
        setSelectedCells(new Set([`${newActive.row}-${newActive.col}`]));
        setSelectionAnchor(newActive);
      }
      return newIssues;
    });
    toast({ title: "Issue deleted", variant: "destructive" });
  };

  const handleRowDragStart = (id: string, event: React.DragEvent) => {
    setDraggedRowId(id);
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleRowDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleRowDragEnter = (targetId: string) => {
    if (draggedRowId && draggedRowId !== targetId) {
      setRowDragOverId(targetId);
    }
  };

  const handleRowDragLeave = (targetId: string) => {
    if (rowDragOverId === targetId) {
      setRowDragOverId(null);
    }
  };

  const handleRowDrop = (targetRowId: string) => {
    if (!draggedRowId || draggedRowId === targetRowId || !rowDragOverId) {
      setDraggedRowId(null);
      setRowDragOverId(null);
      return;
    }

    const reorderedIssues = [...issues];
    const draggedItemIndex = reorderedIssues.findIndex(
      (issue) => issue.id === draggedRowId
    );
    let targetItemIndex = reorderedIssues.findIndex(
      (issue) => issue.id === targetRowId
    );

    if (draggedItemIndex === -1 || targetItemIndex === -1) {
      setDraggedRowId(null);
      setRowDragOverId(null);
      return;
    }

    const [draggedItem] = reorderedIssues.splice(draggedItemIndex, 1);
    const finalTargetIndex = reorderedIssues.findIndex(
      (issue) => issue.id === targetRowId
    );
    reorderedIssues.splice(finalTargetIndex, 0, draggedItem);

    setIssues(reorderedIssues);
    toast({
      title: "Issue Reordered",
      description: "Row order has been updated.",
    });
    setDraggedRowId(null);
    setRowDragOverId(null);
  };

  const handleRowDragEnd = () => {
    setDraggedRowId(null);
    setRowDragOverId(null);
  };

  const handleOpenImageEditor = (issueId: string, image: IssueImage) => {
    setEditingImageInfo({ issueId, image });
    setIsImageEditorOpen(true);
  };

  const handleCloseImageEditor = () => {
    setIsImageEditorOpen(false);
    setEditingImageInfo(null);
  };

  const handleSaveEditedImage = (
    issueId: string,
    imageId: string,
    newImageDataUrl: string
  ) => {
    setIssues((prevIssues) =>
      prevIssues.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              images: issue.images.map((img) =>
                img.id === imageId
                  ? {
                      ...img,
                      url: newImageDataUrl,
                      file: new File([], img.name, {
                        type:
                          newImageDataUrl.match(/data:(image\/\w+);/)?.[1] ||
                          "image/png",
                      }),
                    } // Update URL and recreate File
                  : img
              ),
            }
          : issue
      )
    );
    toast({
      title: "Image updated",
      description: "Your changes have been saved.",
    });
    handleCloseImageEditor();
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-muted-foreground">
          Loading Issue Tracker...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-headline font-bold text-primary">
          Issue Tracker
        </h1>
        <p className="text-muted-foreground">
          Manage your project issues with ease.
        </p>
      </header>

      <div className="mb-6 flex justify-end">
        <Button onClick={handleAddNewIssue} variant="default">
          <PlusCircle size={20} className="mr-2" />
          Add New Issue
        </Button>
      </div>

      <IssueTable
        issues={issues}
        onDescriptionChange={handleDescriptionChange}
        onImagesChange={handleImagesChange}
        onRemoveImage={handleRemoveImage}
        onCopy={handleCopy}
        onDelete={handleDelete}
        activeCell={activeCell}
        selectedCells={selectedCells}
        tableContainerRef={tableContainerRef}
        onCellMouseDown={handleCellMouseDown}
        onCellMouseEnter={handleCellMouseEnter}
        onTableKeyDown={handleTableKeyDown}
        selectableColIndices={SELECTABLE_COL_INDICES}
        onColumnHeaderClick={handleColumnHeaderClick}
        draggedRowId={draggedRowId}
        rowDragOverId={rowDragOverId}
        onRowDragStart={handleRowDragStart}
        onRowDragOver={handleRowDragOver}
        onRowDragEnter={handleRowDragEnter}
        onRowDragLeave={handleRowDragLeave}
        onRowDrop={handleRowDrop}
        onRowDragEnd={handleRowDragEnd}
        onOpenImageEditor={handleOpenImageEditor}
      />
      {isImageEditorOpen && editingImageInfo && (
        <ImageEditorModal
          isOpen={isImageEditorOpen}
          onClose={handleCloseImageEditor}
          image={editingImageInfo.image}
          onSave={(newImageDataUrl) =>
            handleSaveEditedImage(
              editingImageInfo.issueId,
              editingImageInfo.image.id,
              newImageDataUrl
            )
          }
        />
      )}
    </div>
  );
}
