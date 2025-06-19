"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { IssueImage } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Pencil,
  Palette,
  Minus,
  Plus,
  Eraser,
  Square,
  Circle,
  Undo2,
  Redo2,
  Type,
  ArrowRight,
  ArrowRightLeft,
  MinusIcon,
  Grip,
  DotIcon,
  Crop,
  PenTool,
  Download,
  Filter,
} from "lucide-react";
import { CurveTool } from "./CurveTool";

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: IssueImage;
  onSave: (newImageDataUrl: string) => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

type StrokeStyle = "solid" | "dashed" | "dotted" | "double";
type FontFamily = "sans-serif" | "serif" | "monospace" | "cursive" | "fantasy";

interface TextStyle {
  fontSize: number;
  fontFamily: FontFamily;
  color: string;
  backgroundColor: string | null;
}

interface Point {
  x: number;
  y: number;
}

export type DrawingTool =
  | "pencil"
  | "eraser"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow"
  | "double-arrow"
  | "crop"
  | "text"
  | "curve";

const availableColors = [
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#FF0000" },
  { name: "Blue", value: "#0000FF" },
  { name: "Green", value: "#008000" },
  { name: "Yellow", value: "#FFFF00" },
  { name: "White", value: "#FFFFFF" },
  { name: "Transparent", value: "transparent" },
];

// const fontFamilies: FontFamily[] = [
//   "sans-serif",
//   "serif",
//   "monospace",
//   "cursive",
//   "fantasy",
// ];

const minBrushSize = 1;
const maxBrushSize = 20;

export default function ImageEditorModal({
  isOpen,
  onClose,
  image,
  onSave,
}: ImageEditorModalProps) {
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool | null>(null);
  const [currentColor, setCurrentColor] = useState<string>("#000000");
  const [brushSize, setBrushSize] = useState<number>(3);
  const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>("solid");
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const [fontSize, setFontSize] = useState<number>(22);
  const [textInputPosition, setTextInputPosition] = useState<Point | null>(
    null
  );
  const [text, setText] = useState("");
  const [showCropConfirm, setShowCropConfirm] = useState(false);
  const [showCurveConfirm, setShowCurveConfirm] = useState(false);
  // Removed curve-related state

  // Crop-related state
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  // Text styling state
  const [textStyle, setTextStyle] = useState<TextStyle>({
    fontSize: fontSize,
    fontFamily: "sans-serif",
    color: currentColor,
    backgroundColor: null,
  });

  const { toast } = useToast();

  const drawImageOnCanvas = useCallback(() => {
    const baseCanvas = baseCanvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    const baseCtx = baseCanvas?.getContext("2d");
    const drawingCtx = drawingCanvas?.getContext("2d");

    if (!baseCanvas || !baseCtx || !drawingCanvas || !drawingCtx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image.url;
    img.onload = () => {
      const container = baseCanvas.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      const aspectRatio = img.naturalWidth / img.naturalHeight;
      let newWidth = containerWidth;
      let newHeight = newWidth / aspectRatio;

      // If the new height is greater than the container height, scale down
      if (newHeight > containerHeight) {
        newHeight = containerHeight;
        newWidth = newHeight * aspectRatio;
      }

      baseCanvas.width = newWidth;
      baseCanvas.height = newHeight;
      drawingCanvas.width = newWidth;
      drawingCanvas.height = newHeight;

      // Draw the image centered on the base canvas
      const x = (newWidth - img.naturalWidth) / 2;
      const y = (newHeight - img.naturalHeight) / 2;
      const scale = Math.min(
        newWidth / img.naturalWidth,
        newHeight / img.naturalHeight
      );

      const scaleWidth = img.naturalWidth * scale;
      const scaleHeight = img.naturalHeight * scale;

      const centerX = (newWidth - scaleWidth) / 2;
      const centerY = (newHeight - scaleHeight) / 2;

      baseCtx.drawImage(img, centerX, centerY, scaleWidth, scaleHeight);
      saveHistory();
    };
    img.onerror = () => {
      console.error("Failed to load image for editing.");
    };
  }, [image.url]);

  useEffect(() => {
    if (!isOpen || !image.url) return;

    const timeout = setTimeout(() => {
      if (baseCanvasRef.current && drawingCanvasRef.current) {
        drawImageOnCanvas();
        setHistory([]);
        setHistoryStep(-1);
      }
    }, 0); // Wait for canvas to mount

    return () => clearTimeout(timeout);
  }, [isOpen, image.url, drawImageOnCanvas]);

  const saveHistory = () => {
    const drawingCanvas = drawingCanvasRef.current;
    const ctx = drawingCanvas?.getContext("2d");
    if (!drawingCanvas || !ctx) return;
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(
      ctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height)
    );
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = useCallback(() => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      const canvas = drawingCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (newStep >= 0) {
          ctx.putImageData(history[newStep], 0, 0);
        }
      }
    }
  }, [historyStep, history]);

  const redo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1;
      setHistoryStep(newStep);
      const canvas = drawingCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.putImageData(history[newStep], 0, 0);
      }
    }
  }, [historyStep, history]);

  // Add download function
  const downloadImage = () => {
    const baseCanvas = baseCanvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (!baseCanvas || !drawingCanvas) return;

    // Create a new canvas to combine both layers
    const combinedCanvas = document.createElement("canvas");
    combinedCanvas.width = baseCanvas.width;
    combinedCanvas.height = baseCanvas.height;
    const combinedCtx = combinedCanvas.getContext("2d");
    if (!combinedCtx) return;

    // Draw both layers
    combinedCtx.drawImage(baseCanvas, 0, 0);
    combinedCtx.drawImage(drawingCanvas, 0, 0);

    // Create download link
    const link = document.createElement("a");
    link.download = `edited-${image.name || "image"}.png`;
    link.href = combinedCanvas.toDataURL("image/png");
    link.click();
  };

  // Add black & white filter function
  const applyBlackAndWhite = () => {
    const baseCanvas = baseCanvasRef.current;
    const ctx = baseCanvas?.getContext("2d");
    if (!baseCanvas || !ctx) return;

    // save current state before applying filter
    saveHistory();

    // Get image data
    const imageData = ctx.getImageData(
      0,
      0,
      baseCanvas.width,
      baseCanvas.height
    );
    const data = imageData.data;

    // Convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = (r + g + b) / 3;

      // Set all color channels to the gray value
      data[i] = gray; // Red
      data[i + 1] = gray; // Green
      data[i + 2] = gray; // Blue
      // data[i + 3] is alpha, leave it unchanged
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
    saveHistory();
  };

  const handleToolChange = (tool: DrawingTool) => {
    // Clean up crop tool state
    if (activeTool === "crop") {
      setCropArea(null);
      setIsCropping(false);
      setDragStart(null);
      const ctx = drawingCanvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.globalCompositeOperation = "source-over"; // Reset composite operation
      }
    }

    // Clear text input position when switching tools
    if (activeTool === "text") {
      setTextInputPosition(null);
      setText("");
    }

    setActiveTool(tool);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if modal is focused
      if (
        !document
          .querySelector('[role="dialog"]')
          ?.contains(document.activeElement)
      ) {
        return;
      }

      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (e.key === "z") {
          e.preventDefault();
          undo();
        } else if (e.key === "y") {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, undo, redo]);

  const getMousePos = (
    e: React.MouseEvent<HTMLCanvasElement>
  ): { x: number; y: number } => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const drawText = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    style: TextStyle
  ) => {
    ctx.font = `${style.fontSize}px ${style.fontFamily}`;

    // If background color is set and not transparent, draw it first
    if (style.backgroundColor && style.backgroundColor !== "transparent") {
      const metrics = ctx.measureText(text);
      const textHeight = style.fontSize;
      ctx.fillStyle = style.backgroundColor;
      ctx.fillRect(
        x,
        y - textHeight + 4, // Adjust for baseline
        metrics.width,
        textHeight
      );
    }

    // Draw the text
    ctx.fillStyle = style.color;
    ctx.fillText(text, x, y);
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    isDouble: boolean
  ) => {
    const headlen = brushSize * 5; // length of arrow head relative to brush size
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Draw the main line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.stroke();

    // Draw the arrow head at the end
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headlen * Math.cos(angle - Math.PI / 6),
      toY - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headlen * Math.cos(angle + Math.PI / 6),
      toY - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();

    // Draw the arrow head at the start if double-headed
    if (isDouble) {
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(
        fromX + headlen * Math.cos(angle - Math.PI / 6),
        fromY + headlen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(
        fromX + headlen * Math.cos(angle + Math.PI / 6),
        fromY + headlen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }
  };

  const configureStrokeStyle = (ctx: CanvasRenderingContext2D) => {
    switch (strokeStyle) {
      case "solid":
        ctx.setLineDash([]);
        ctx.lineWidth = brushSize;
        break;
      case "dashed":
        ctx.setLineDash([brushSize * 3, brushSize * 2]);
        ctx.lineWidth = brushSize;
        break;
      case "dotted":
        ctx.setLineDash([brushSize, brushSize]);
        ctx.lineWidth = brushSize;
        break;
      case "double":
        // For double lines, we'll draw two parallel lines
        ctx.setLineDash([]);
        ctx.lineWidth = brushSize / 2;
        break;
    }
  };

  const drawShape = (
    ctx: CanvasRenderingContext2D,
    shape: "line" | "rectangle" | "circle",
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    configureStrokeStyle(ctx);

    if (shape === "line") {
      if (strokeStyle === "double") {
        // Draw two parallel lines
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const offset = brushSize / 2;

        // First line
        ctx.beginPath();
        ctx.moveTo(
          start.x + Math.cos(angle + Math.PI / 2) * offset,
          start.y + Math.sin(angle + Math.PI / 2) * offset
        );
        ctx.lineTo(
          end.x + Math.cos(angle + Math.PI / 2) * offset,
          end.y + Math.sin(angle + Math.PI / 2) * offset
        );
        ctx.stroke();

        // Second line
        ctx.beginPath();
        ctx.moveTo(
          start.x + Math.cos(angle - Math.PI / 2) * offset,
          start.y + Math.sin(angle - Math.PI / 2) * offset
        );
        ctx.lineTo(
          end.x + Math.cos(angle - Math.PI / 2) * offset,
          end.y + Math.sin(angle - Math.PI / 2) * offset
        );
        ctx.stroke();
      } else {
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    } else if (shape === "rectangle") {
      if (strokeStyle === "double") {
        // Draw outer rectangle
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
        // Draw inner rectangle
        const offset = brushSize;
        ctx.strokeRect(
          start.x + offset,
          start.y + offset,
          end.x - start.x - 2 * offset,
          end.y - start.y - 2 * offset
        );
      } else {
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      }
    } else if (shape === "circle") {
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );
      if (strokeStyle === "double") {
        // Draw outer circle
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        // Draw inner circle
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius - brushSize, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Reset line dash to default
    ctx.setLineDash([]);
  };
  // No curve-related functions are needed

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (activeTool === "text") {
      setTextInputPosition(pos);
      return;
    }

    if (activeTool === "crop") {
      // Clear any existing crop area
      const ctx = drawingCanvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
      setIsDrawing(true);
      setIsCropping(true);
      setDragStart(pos);
      setCropArea({
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
      });
      drawCropOverlay();
      return;
    }

    const ctx = drawingCanvasRef.current?.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setStartPoint(pos);

    if (activeTool && ["pencil", "eraser"].includes(activeTool)) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);

      if (activeTool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = currentColor;
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const currentPos = getMousePos(e);

    if (activeTool === "text" || !isDrawing) return;

    const drawingCanvas = drawingCanvasRef.current;
    const ctx = drawingCanvas?.getContext("2d");

    if (!drawingCanvas || !ctx) return;

    if (activeTool === "crop" && dragStart && isDrawing) {
      // Constrain to canvas boundaries
      const x = Math.max(0, Math.min(currentPos.x, drawingCanvas.width));
      const y = Math.max(0, Math.min(currentPos.y, drawingCanvas.height));

      const width = x - dragStart.x;
      const height = y - dragStart.y;

      const newCropArea = {
        x: width < 0 ? x : dragStart.x,
        y: height < 0 ? y : dragStart.y,
        width: Math.abs(width),
        height: Math.abs(height),
      };

      setCropArea(newCropArea);
      requestAnimationFrame(() => drawCropOverlay());
      return;
    }

    // Handle other tools
    if (activeTool && ["pencil", "eraser"].includes(activeTool)) {
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    } else {
      // Shape drawing - restore last state and draw new shape
      const lastHistoryState = history[historyStep];
      if (lastHistoryState) {
        ctx.putImageData(lastHistoryState, 0, 0);
      } else {
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      }

      if (activeTool === "rectangle") {
        drawShape(ctx, "rectangle", startPoint!, currentPos);
      } else if (activeTool === "circle") {
        drawShape(ctx, "circle", startPoint!, currentPos);
      } else if (activeTool === "line") {
        drawShape(ctx, "line", startPoint!, currentPos);
      } else if (activeTool === "arrow" || activeTool === "double-arrow") {
        ctx.strokeStyle = currentColor;
        configureStrokeStyle(ctx);
        drawArrow(
          ctx,
          startPoint!.x,
          startPoint!.y,
          currentPos.x,
          currentPos.y,
          activeTool === "double-arrow"
        );
        ctx.setLineDash([]);
      }
    }
  };

  const stopDrawing = () => {
    if (activeTool === "crop") {
      setIsDrawing(false);

      if (cropArea && cropArea.width > 10 && cropArea.height > 10) {
        setIsCropping(false);
        setDragStart(null);
        // Keep the overlay visible after finishing the drag
        requestAnimationFrame(() => drawCropOverlay());
      } else {
        // Cancel crop if area is too small
        setCropArea(null);
        setIsCropping(false);
        setDragStart(null);
        const ctx = drawingCanvasRef.current?.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
      }
      return;
    }

    if (!isDrawing) return;
    const ctx = drawingCanvasRef.current?.getContext("2d");

    if (ctx) {
      if (activeTool && ["pencil", "eraser"].includes(activeTool)) {
        ctx.closePath();
        ctx.globalCompositeOperation = "source-over";
      }
    }

    setIsDrawing(false);
    setStartPoint(null);
    saveHistory();
  };

  const handleSave = () => {
    if (cropArea) {
      // Don't save while cropping
      return;
    }

    const baseCanvas = baseCanvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (!baseCanvas || !drawingCanvas) return;

    // Create a temporary canvas to combine the layers
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = baseCanvas.width;
    tempCanvas.height = baseCanvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    // Draw both layers
    tempCtx.drawImage(baseCanvas, 0, 0);
    tempCtx.drawImage(drawingCanvas, 0, 0);

    // Get the combined result
    const dataUrl = tempCanvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  const FloatingTextInput = ({
    position,
    onSubmit,
  }: {
    position: { x: number; y: number };
    onSubmit: (text: string) => void;
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputText, setInputText] = useState("");

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && inputText.trim()) {
        onSubmit(inputText);
        setInputText("");
        setTextInputPosition(null);
      } else if (e.key === "Escape") {
        setInputText("");
        setTextInputPosition(null);
      }
    };

    // Only submit on blur if the input is not empty
    const handleBlur = (e: React.FocusEvent) => {
      // Check if the related target (where focus is going) is part of the text input container
      const isClickInsideComponent = e.currentTarget.contains(
        e.relatedTarget as Node
      );

      if (!isClickInsideComponent) {
        if (inputText.trim()) {
          onSubmit(inputText);
          setInputText("");
          setTextInputPosition(null);
        }
      }
    };

    return (
      <div
        className="flex flex-col gap-2 p-2 bg-background/95 border rounded-lg shadow-lg"
        style={{
          position: "absolute",
          left: position.x,
          top: position.y - textStyle.fontSize / 2,
          zIndex: 10,
          minWidth: "200px",
        }}
        onMouseDown={(e) => e.stopPropagation()} // Prevent canvas events from interfering
        tabIndex={-1} // Make the container focusable
      >
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            borderBottom: "1px solid " + textStyle.color,
            color: textStyle.color,
            fontSize: `${textStyle.fontSize}px`,
            fontFamily: textStyle.fontFamily,
            width: "100%",
          }}
          placeholder="Type and press Enter..."
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={textStyle.backgroundColor || "transparent"}
            onValueChange={(value) =>
              setTextStyle((prev) => ({
                ...prev,
                backgroundColor: value === "transparent" ? null : value,
              }))
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Background" />
            </SelectTrigger>
            <SelectContent>
              {availableColors.map((color) => (
                <SelectItem key={color.value} value={color.value}>
                  <div className="flex items-center">
                    <div
                      style={{ backgroundColor: color.value }}
                      className="w-4 h-4 rounded-full mr-2 border"
                    />
                    {color.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const drawCropOverlay = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !cropArea) return;

    // Always start with a clean canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set composite operation to work with transparent background
    ctx.globalCompositeOperation = "source-over";

    // Draw semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear the crop area
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // Reset composite operation for drawing borders
    ctx.globalCompositeOperation = "source-over";

    // Draw crop area border with a thicker, more visible style
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // Draw a second border to make it more visible
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
      cropArea.x - 1,
      cropArea.y - 1,
      cropArea.width + 2,
      cropArea.height + 2
    );
    ctx.setLineDash([]);

    // Draw corner handles
    const handleSize = 8;
    // Draw white squares with black borders for better visibility
    [
      [cropArea.x - handleSize / 2, cropArea.y - handleSize / 2],
      [
        cropArea.x + cropArea.width - handleSize / 2,
        cropArea.y - handleSize / 2,
      ],
      [
        cropArea.x - handleSize / 2,
        cropArea.y + cropArea.height - handleSize / 2,
      ],
      [
        cropArea.x + cropArea.width - handleSize / 2,
        cropArea.y + cropArea.height - handleSize / 2,
      ],
    ].forEach(([x, y]) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, handleSize, handleSize);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, handleSize, handleSize);
    });
  }, [cropArea]);

  const applyCrop = useCallback(() => {
    if (!cropArea || !baseCanvasRef.current) return;

    const baseCanvas = baseCanvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    const baseCtx = baseCanvas.getContext("2d");
    const drawingCtx = drawingCanvas?.getContext("2d");
    if (!baseCtx || !drawingCtx || !drawingCanvas) return;

    // Ensure crop dimensions are positive and within canvas bounds
    const validCropArea = {
      x: Math.max(0, Math.min(cropArea.x, baseCanvas.width)),
      y: Math.max(0, Math.min(cropArea.y, baseCanvas.height)),
      width: Math.min(cropArea.width, baseCanvas.width - cropArea.x),
      height: Math.min(cropArea.height, baseCanvas.height - cropArea.y),
    };

    // Create temporary canvases for both base and drawing layers
    const tempBaseCanvas = document.createElement("canvas");
    const tempDrawingCanvas = document.createElement("canvas");
    tempBaseCanvas.width = cropArea.width;
    tempBaseCanvas.height = cropArea.height;
    tempDrawingCanvas.width = cropArea.width;
    tempDrawingCanvas.height = cropArea.height;

    const tempBaseCtx = tempBaseCanvas.getContext("2d");
    const tempDrawingCtx = tempDrawingCanvas.getContext("2d");
    if (!tempBaseCtx || !tempDrawingCtx) return;

    // Copy the cropped portions to the temp canvases
    tempBaseCtx.drawImage(
      baseCanvas,
      cropArea.x,
      cropArea.y,
      tempBaseCanvas.width,
      tempBaseCanvas.height,
      0,
      0,
      tempBaseCanvas.width,
      tempBaseCanvas.height
    );

    tempDrawingCtx.drawImage(
      drawingCanvas,
      cropArea.x,
      cropArea.y,
      tempDrawingCanvas.width,
      tempDrawingCanvas.height,
      0,
      0,
      tempDrawingCanvas.width,
      tempDrawingCanvas.height
    );

    // Resize both canvases
    baseCanvas.width = tempBaseCanvas.width;
    baseCanvas.height = tempBaseCanvas.height;
    drawingCanvas.width = tempDrawingCanvas.width;
    drawingCanvas.height = tempDrawingCanvas.height;

    // Draw the cropped images back
    baseCtx.drawImage(tempBaseCanvas, 0, 0);
    drawingCtx.drawImage(tempDrawingCanvas, 0, 0);

    // Clear crop area and reset cropping state
    setCropArea(null);
    setIsCropping(false);

    // Save to history
    saveHistory();
  }, [cropArea]);

  const flattenLayers = useCallback(() => {
    const baseCanvas = baseCanvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (!baseCanvas || !drawingCanvas) return;

    // Create a temporary canvas to combine the layers
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = baseCanvas.width;
    tempCanvas.height = baseCanvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    // Draw both layers onto the temp canvas
    tempCtx.drawImage(baseCanvas, 0, 0);
    tempCtx.drawImage(drawingCanvas, 0, 0);

    // Clear both original canvases
    const baseCtx = baseCanvas.getContext("2d");
    const drawingCtx = drawingCanvas.getContext("2d");
    if (!baseCtx || !drawingCtx) return;

    // Update the base canvas with the flattened image
    baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
    baseCtx.drawImage(tempCanvas, 0, 0);

    // Clear the drawing canvas
    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

    // Reset history since we're starting fresh
    setHistory([]);
    setHistoryStep(-1);
  }, []);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Edit Image: {image.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-grow flex px-4 gap-4 overflow-hidden">
          {/* Toolbar */}
          <div className="w-52 flex-shrink-0 flex flex-col gap-2 p-2 border-r overflow-y-auto">
            {/* History Controls */}
            <div className="flex gap-2 mb-2">
              <Button
                variant="outline"
                size="icon"
                onClick={undo}
                disabled={historyStep <= 0}
                title="Undo"
                className="flex-1"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={redo}
                disabled={historyStep >= history.length - 1}
                title="Redo"
                className="flex-1"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col mb-2">
              <h3 className="text-lg font-semibold">Tools</h3>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={activeTool === "pencil" ? "secondary" : "ghost"}
                  onClick={() => handleToolChange("pencil")}
                  className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                >
                  <Pencil className="h-4 w-4" />
                  <span>Pencil</span>
                </Button>
                <Button
                  variant={activeTool === "eraser" ? "secondary" : "ghost"}
                  onClick={() => handleToolChange("eraser")}
                  className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                >
                  <Eraser className="h-4 w-4" /> Eraser
                </Button>
                <Button
                  variant={activeTool === "rectangle" ? "secondary" : "ghost"}
                  onClick={() => handleToolChange("rectangle")}
                  className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                >
                  <Square className="h-4 w-4" /> Rectangle
                </Button>
                <Button
                  variant={activeTool === "circle" ? "secondary" : "ghost"}
                  onClick={() => handleToolChange("circle")}
                  className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                >
                  <Circle className="h-4 w-4" /> Circle
                </Button>
                <Button
                  variant={
                    (activeTool as DrawingTool) === "text"
                      ? "secondary"
                      : "ghost"
                  }
                  onClick={() => handleToolChange("text")}
                  className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                >
                  <Type className="h-4 w-4" /> Text
                </Button>
                <Button
                  variant={activeTool === "arrow" ? "secondary" : "ghost"}
                  onClick={() => handleToolChange("arrow")}
                  className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                >
                  <ArrowRight className="h-4 w-4" /> Arrow
                </Button>
                <Button
                  variant={
                    activeTool === "double-arrow" ? "secondary" : "ghost"
                  }
                  onClick={() => handleToolChange("double-arrow")}
                  className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  <span>
                    Double <br></br> Arrow
                  </span>
                </Button>
                <Button
                  variant={activeTool === "line" ? "secondary" : "ghost"}
                  onClick={() => handleToolChange("line")}
                  className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                >
                  <MinusIcon className="h-4 w-4" /> Line
                </Button>

                <Button
                  variant={activeTool === "crop" ? "secondary" : "ghost"}
                  onClick={() => {
                    // Check if there are any changes on the drawing canvas
                    const drawingCanvas = drawingCanvasRef.current;
                    const ctx = drawingCanvas?.getContext("2d");
                    if (!drawingCanvas || !ctx) return;

                    // Get the image data to check if there are any non-transparent pixels
                    const imageData = ctx.getImageData(
                      0,
                      0,
                      drawingCanvas.width,
                      drawingCanvas.height
                    ).data;
                    const hasChanges = imageData.some((pixel, index) => {
                      // Check alpha channel (every 4th value)
                      return index % 4 === 3 && pixel !== 0;
                    });

                    if (hasChanges) {
                      // If there are changes, show confirmation dialog
                      setShowCropConfirm(true);
                    } else {
                      // If no changes, switch to crop tool directly
                      handleToolChange("crop");
                    }
                  }}
                  className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                >
                  <Crop className="h-4 w-4" /> Crop
                </Button>
                <Button
                  variant={activeTool === "curve" ? "secondary" : "ghost"}
                  onClick={() => {
                    // Check if there are any changes on the drawing canvas
                    const drawingCanvas = drawingCanvasRef.current;
                    const ctx = drawingCanvas?.getContext("2d");
                    if (!drawingCanvas || !ctx) return;

                    // Get the image data to check if there are any non-transparent pixels
                    const imageData = ctx.getImageData(
                      0,
                      0,
                      drawingCanvas.width,
                      drawingCanvas.height
                    ).data;
                    const hasChanges = imageData.some((pixel, index) => {
                      // Check alpha channel (every 4th value)
                      return index % 4 === 3 && pixel !== 0;
                    });

                    if (hasChanges) {
                      // If there are changes, show confirmation dialog
                      setShowCurveConfirm(true);
                    } else {
                      // If no changes, switch to curve tool directly
                      setActiveTool("curve");
                    }
                  }}
                  className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                >
                  <PenTool className="h-4 w-4" /> Curve
                </Button>
              </div>
            </div>

            {/* Confirmation dialog for crop */}
            {showCropConfirm && (
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  These changes till now will be saved and they cannot be undone
                  after cropping. You can make new changes after cropping the
                  image.
                </p>
                <div className="flex flex-col gap-2 flex-wrap">
                  <Button
                    type="button"
                    onClick={() => {
                      flattenLayers();
                      setActiveTool("crop");
                      setShowCropConfirm(false);
                      toast({
                        title: "Changes Saved",
                        description:
                          "Previous changes have been saved. You can continue making new changes after cropping.",
                        duration: 3000,
                      });
                    }}
                    className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                  >
                    Proceed
                  </Button>
                </div>
              </div>
            )}
            {/* Confirmation dialog for curve */}
            {showCurveConfirm && (
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  These changes till now will be saved and they cannot be undone
                  after drawing a new curve. You can make new changes after
                  drawing the curve.
                </p>
                <div className="flex flex-col gap-2 flex-wrap">
                  <Button
                    type="button"
                    onClick={() => {
                      flattenLayers();
                      setActiveTool("curve");
                      setShowCurveConfirm(false);
                      toast({
                        title: "Changes Saved",
                        description:
                          "Previous changes have been saved. You can continue making new changes after drawing the curve.",
                        duration: 3000,
                      });
                    }}
                    className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                  >
                    Proceed
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setShowCurveConfirm(false)}
                    className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Tool-specific controls */}
            {activeTool === "crop" && (
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  Draw a rectangle to crop the image. Click "Save Changes" to
                  apply the crop.
                </p>
                <div className="flex flex-col gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCropArea(null);
                      const ctx = drawingCanvasRef.current?.getContext("2d");
                      if (ctx) {
                        ctx.clearRect(
                          0,
                          0,
                          ctx.canvas.width,
                          ctx.canvas.height
                        );
                      }
                    }}
                    disabled={!cropArea}
                    className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={applyCrop}
                    disabled={!cropArea}
                    className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}

            {/* Show stroke style selector for shape tools */}
            {activeTool &&
              [
                "line",
                "rectangle",
                "circle",
                "arrow",
                "double-arrow",
                "curve",
              ].includes(activeTool) && (
                <div className="mt-4">
                  <Label
                    htmlFor="stroke-style"
                    className="flex items-center gap-2 mb-1"
                  >
                    <Grip className="h-4 w-4" /> Stroke Style
                  </Label>
                  <Select
                    value={strokeStyle}
                    onValueChange={(value: StrokeStyle) =>
                      setStrokeStyle(value)
                    }
                  >
                    <SelectTrigger id="stroke-style">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">
                        <div className="flex items-center">
                          <MinusIcon className="w-4 h-4 mr-2" /> Solid
                        </div>
                      </SelectItem>
                      <SelectItem value="dashed">
                        <div className="flex items-center">
                          <div className="w-4 h-4 mr-2 flex items-center">
                            <div className="w-full border-t-2 border-dashed" />
                          </div>
                          Dashed
                        </div>
                      </SelectItem>
                      <SelectItem value="dotted">
                        <div className="flex items-center">
                          <DotIcon className="w-4 h-4 mr-2" /> Dotted
                        </div>
                      </SelectItem>
                      <SelectItem value="double">
                        <div className="flex items-center">
                          <div className="w-4 h-4 mr-2 flex flex-col justify-center gap-0.5">
                            <div className="w-full border-t" />
                            <div className="w-full border-t" />
                          </div>
                          Double
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

            {(activeTool as DrawingTool) === "text" && (
              <div className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="font-size" className="text-sm">
                    Font Size: {textStyle.fontSize}px
                  </Label>
                  <Slider
                    id="font-size"
                    min={8}
                    max={72}
                    step={1}
                    value={[textStyle.fontSize]}
                    onValueChange={(value) =>
                      setTextStyle((prev) => ({ ...prev, fontSize: value[0] }))
                    }
                    className="flex-grow"
                  />
                </div>

                <div>
                  <Label htmlFor="text-bg-color" className="text-sm">
                    Background Color
                  </Label>
                  <Select
                    value={textStyle.backgroundColor || "transparent"}
                    onValueChange={(value) =>
                      setTextStyle((prev) => ({
                        ...prev,
                        backgroundColor: value === "transparent" ? null : value,
                      }))
                    }
                  >
                    <SelectTrigger id="text-bg-color">
                      <SelectValue placeholder="Select background" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColors.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center">
                            <div
                              style={{ backgroundColor: color.value }}
                              className="w-4 h-4 rounded-full mr-2 border"
                            />
                            {color.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-sm text-muted-foreground mt-2">
                  Click on the canvas to add text
                </p>
              </div>
            )}

            <div className="mt-4">
              <Label
                htmlFor="color-picker"
                className="flex items-center gap-2 mb-2"
              >
                <Palette className="h-4 w-4" /> Color
              </Label>
              <Select value={currentColor} onValueChange={setCurrentColor}>
                <SelectTrigger id="color-picker">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {availableColors.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center">
                        <div
                          style={{ backgroundColor: color.value }}
                          className="w-4 h-4 rounded-full mr-2 border"
                        />
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-2">
              <Label htmlFor="brush-size" className="mb-2 block">
                Brush Size: {brushSize}px
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setBrushSize((s) => Math.max(minBrushSize, s - 1))
                  }
                  className="h-8 w-8"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Slider
                  id="brush-size"
                  min={minBrushSize}
                  max={maxBrushSize}
                  step={1}
                  value={[brushSize]}
                  onValueChange={(value) => setBrushSize(value[0])}
                  className="flex-grow"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setBrushSize((s) => Math.min(maxBrushSize, s + 1))
                  }
                  className="h-8 w-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-grow flex items-center justify-center bg-muted/30 rounded-md overflow-auto relative">
            <canvas
              ref={baseCanvasRef}
              className="max-w-full max-h-full object-contain shadow-lg absolute top-0 left-0"
            />
            <canvas
              ref={drawingCanvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="max-w-full max-h-full object-contain"
              style={{
                display: "block",
                position: "absolute",
                top: 0,
                left: 0,
                cursor:
                  activeTool === "crop"
                    ? "crosshair"
                    : (activeTool as DrawingTool) === "text"
                    ? "text"
                    : activeTool === null
                    ? "default"
                    : "crosshair",
              }}
            />

            {activeTool === "curve" && (
              <CurveTool
                active={activeTool === "curve"}
                canvasRef={drawingCanvasRef}
                currentColor={currentColor}
                setActiveTool={setActiveTool}
                strokeStyle={strokeStyle}
                brushSize={brushSize}
              />
            )}
            {textInputPosition && (
              <FloatingTextInput
                position={textInputPosition}
                onSubmit={(submittedText) => {
                  const drawingCanvas = drawingCanvasRef.current;
                  const ctx = drawingCanvas?.getContext("2d");
                  if (!drawingCanvas || !ctx) return;

                  drawText(
                    ctx,
                    textInputPosition.x,
                    textInputPosition.y,
                    submittedText,
                    textStyle
                  );
                  setTextInputPosition(null); // Clear text input position after submission
                  setText("");
                  saveHistory();
                }}
              />
            )}

            {/* Crop area is handled by drawCropOverlay */}
          </div>
        </div>

        <DialogFooter className="p-4 border-t">
          <Button variant={"outline"} onClick={applyBlackAndWhite}>
            <Filter className="h-4 w-4" />
            Apply Filter
          </Button>
          <Button variant={"secondary"} onClick={downloadImage} type="button">
            <Download className="h-4 w-4" /> Download
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
