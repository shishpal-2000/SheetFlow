"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { IssueImage } from "@/types";
import dynamic from "next/dynamic";
const TextEditor = dynamic(() => import("./TextEditor"), { ssr: false });
import type { TextEditorHandle, KonvaTextShape } from "./TextEditor";
const KonvaRectangle = dynamic(() => import("./KonvaRectangle"), {
  ssr: false,
});
import type { KonvaRectangleHandle } from "./KonvaRectangle";
const ArrowKonva = dynamic(() => import("./ArrowKonva"), { ssr: false });
import type { KonvaArrowHandle, KonvaArrow } from "./ArrowKonva";

const KonvaCircle = dynamic(() => import("./KonvaCircle"), { ssr: false });
import type { KonvaCircleHandle, KonvaCircleShape } from "./KonvaCircle";

const KonvaDoubleArrow = dynamic(() => import("./KonvaDoubleArrow"), {
  ssr: false,
});
import type {
  KonvaDoubleArrowHandle,
  KonvaDoubleArrowShape,
} from "./KonvaDoubleArrow";

import { v4 as uuidv4 } from "uuid";
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
import CurveArrowTool from "./CurveArrowTool";
import MobileView from "./MobileView";

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

export type StrokeStyle = "solid" | "dashed" | "dotted" | "double";
type FontFamily = "sans-serif" | "serif" | "monospace" | "cursive" | "fantasy";

export interface Point {
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
  | "curve"
  | "curve-arrow";

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
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const [fontSize, setFontSize] = useState<number>(22);
  const [textInputPosition, setTextInputPosition] = useState<Point | null>(
    null
  );
  const [text, setText] = useState("");
  const [isTextToolActive, setIsTextToolActive] = useState(false);
  const [showCropConfirm, setShowCropConfirm] = useState(false);
  const [showCurveConfirm, setShowCurveConfirm] = useState(false);
  const [showCurveArrowConfirm, setShowCurveArrowConfirm] = useState(false);

  // jai maa kali
  const [rectangles, setRectangles] = useState<any[]>([]);
  const konvaRectRef = useRef<KonvaRectangleHandle>(null);

  const [texts, setTexts] = useState<KonvaTextShape[]>([]);
  const textEditorRef = useRef<TextEditorHandle>(null);
  const [fontFamily, setFontFamily] = useState<FontFamily>("sans-serif");

  // Crop-related state
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  // Style-related state
  const [backgroundColor, setBackgroundColor] = useState<string>("transparent");
  const [currentColor, setCurrentColor] = useState<string>("#000000");
  const [brushSize, setBrushSize] = useState<number>(3);
  const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>("solid");

  // Add state and ref for arrows
  const [arrows, setArrows] = useState<KonvaArrow[]>([]);
  const konvaArrowRef = useRef<KonvaArrowHandle>(null);

  // circles
  const [circles, setCircles] = useState<KonvaCircleShape[]>([]);
  const konvaCircleRef = useRef<KonvaCircleHandle>(null);

  // Add state and ref for double arrows
  const [doubleArrows, setDoubleArrows] = useState<KonvaDoubleArrowShape[]>([]);
  const konvaDoubleArrowRef = useRef<KonvaDoubleArrowHandle>(null);

  const [imageDrawParams, setImageDrawParams] = useState<{
    offsetX: number;
    offsetY: number;
    drawWidth: number;
    drawHeight: number;
    naturalWidth: number;
    naturalHeight: number;
  } | null>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleKonvaRectFlatten = useCallback((rects: any[]) => {
    if (!drawingCanvasRef.current) return;
    const ctx = drawingCanvasRef.current.getContext("2d");
    if (!ctx) return;

    rects.forEach((r: any) => {
      ctx.save(); // Save current state

      // Set stroke style
      ctx.strokeStyle = r.stroke;
      ctx.lineWidth = r.strokeWidth;

      if (r.rotation) {
        // For rectangles with rotation
        const centerX = r.x + r.width / 2;
        const centerY = r.y + r.height / 2;

        // Move to rectangle center, rotate, draw centered rectangle
        ctx.translate(centerX, centerY);
        ctx.rotate((r.rotation * Math.PI) / 180);
        ctx.strokeRect(-r.width / 2, -r.height / 2, r.width, r.height);
      } else {
        // For rectangles without rotation - draw directly
        ctx.strokeRect(r.x, r.y, r.width, r.height);
      }

      ctx.restore(); // Restore original state
    });

    setRectangles([]);
    saveHistory();
  }, []);

  const handleKonvaDoubleArrowFlatten = useCallback(
    (arrowShapes: any) => {
      if (!drawingCanvasRef.current || !imageDrawParams) return;
      const ctx = drawingCanvasRef.current.getContext("2d");
      if (!ctx) return;
      const {
        offsetX,
        offsetY,
        drawWidth,
        drawHeight,
        naturalWidth,
        naturalHeight,
      } = imageDrawParams;
      // Calculate scale factors
      const scaleX = drawWidth / naturalWidth;
      const scaleY = drawHeight / naturalHeight;
      arrowShapes.forEach((a: any) => {
        const [x1, y1, x2, y2] = a.points;
        const imgX1 = (x1 - offsetX) / scaleX;
        const imgY1 = (y1 - offsetY) / scaleY;
        const imgX2 = (x2 - offsetX) / scaleX;
        const imgY2 = (y2 - offsetY) / scaleY;
        const drawX1 = offsetX + imgX1 * scaleX;
        const drawY1 = offsetY + imgY1 * scaleY;
        const drawX2 = offsetX + imgX2 * scaleX;
        const drawY2 = offsetY + imgY2 * scaleY;
        ctx.save();
        ctx.strokeStyle = a.stroke;
        ctx.lineWidth = a.strokeWidth ?? 1;
        ctx.beginPath();
        ctx.moveTo(drawX1, drawY1);
        ctx.lineTo(drawX2, drawY2);
        ctx.stroke();
        // Draw arrowhead at both ends
        const headlen = 15;
        const angle = Math.atan2(drawY2 - drawY1, drawX2 - drawX1);
        // End arrowhead
        ctx.beginPath();
        ctx.moveTo(drawX2, drawY2);
        ctx.lineTo(
          drawX2 - headlen * Math.cos(angle - Math.PI / 7),
          drawY2 - headlen * Math.sin(angle - Math.PI / 7)
        );
        ctx.lineTo(
          drawX2 - headlen * Math.cos(angle + Math.PI / 7),
          drawY2 - headlen * Math.sin(angle + Math.PI / 7)
        );
        ctx.lineTo(drawX2, drawY2);
        ctx.lineTo(
          drawX2 - headlen * Math.cos(angle - Math.PI / 7),
          drawY2 - headlen * Math.sin(angle - Math.PI / 7)
        );
        ctx.stroke();
        ctx.fillStyle = a.stroke;
        ctx.fill();
        // Start arrowhead
        ctx.beginPath();
        ctx.moveTo(drawX1, drawY1);
        ctx.lineTo(
          drawX1 + headlen * Math.cos(angle - Math.PI / 7),
          drawY1 + headlen * Math.sin(angle - Math.PI / 7)
        );
        ctx.lineTo(
          drawX1 + headlen * Math.cos(angle + Math.PI / 7),
          drawY1 + headlen * Math.sin(angle + Math.PI / 7)
        );
        ctx.lineTo(drawX1, drawY1);
        ctx.lineTo(
          drawX1 + headlen * Math.cos(angle - Math.PI / 7),
          drawY1 + headlen * Math.sin(angle - Math.PI / 7)
        );
        ctx.stroke();
        ctx.fillStyle = a.stroke;
        ctx.fill();
        ctx.restore();
      });
      setDoubleArrows([]);
      saveHistory();
    },
    [imageDrawParams, setDoubleArrows, saveHistory]
  );

  const handleKonvaArrowFlatten = useCallback(
    (arrowShapes: KonvaArrow[]) => {
      if (!drawingCanvasRef.current || !imageDrawParams) return;
      const ctx = drawingCanvasRef.current.getContext("2d");
      if (!ctx) return;

      const {
        offsetX,
        offsetY,
        drawWidth,
        drawHeight,
        naturalWidth,
        naturalHeight,
      } = imageDrawParams;

      // Calculate scale factors
      const scaleX = drawWidth / naturalWidth;
      const scaleY = drawHeight / naturalHeight;

      arrowShapes.forEach((a: KonvaArrow) => {
        // Map points from canvas to image coordinates
        const [x1, y1, x2, y2] = a.points;
        const imgX1 = (x1 - offsetX) / scaleX;
        const imgY1 = (y1 - offsetY) / scaleY;
        const imgX2 = (x2 - offsetX) / scaleX;
        const imgY2 = (y2 - offsetY) / scaleY;

        // Draw arrow in image coordinates, but transformed back to canvas
        const drawX1 = offsetX + imgX1 * scaleX;
        const drawY1 = offsetY + imgY1 * scaleY;
        const drawX2 = offsetX + imgX2 * scaleX;
        const drawY2 = offsetY + imgY2 * scaleY;

        ctx.save();
        ctx.strokeStyle = a.stroke;
        ctx.lineWidth = a.strokeWidth ?? 1;
        ctx.beginPath();
        ctx.moveTo(drawX1, drawY1);
        ctx.lineTo(drawX2, drawY2);
        ctx.stroke();

        // Draw arrowhead
        const headlen = 15;
        const angle = Math.atan2(drawY2 - drawY1, drawX2 - drawX1);
        ctx.beginPath();
        ctx.moveTo(drawX2, drawY2);
        ctx.lineTo(
          drawX2 - headlen * Math.cos(angle - Math.PI / 7),
          drawY2 - headlen * Math.sin(angle - Math.PI / 7)
        );
        ctx.lineTo(
          drawX2 - headlen * Math.cos(angle + Math.PI / 7),
          drawY2 - headlen * Math.sin(angle + Math.PI / 7)
        );
        ctx.lineTo(drawX2, drawY2);
        ctx.lineTo(
          drawX2 - headlen * Math.cos(angle - Math.PI / 7),
          drawY2 - headlen * Math.sin(angle - Math.PI / 7)
        );
        ctx.stroke();
        ctx.fillStyle = a.stroke;
        ctx.fill();
        ctx.restore();
      });
      setArrows([]);
      saveHistory();
    },
    [imageDrawParams, setArrows, saveHistory]
  );

  // const handleTextFlatten = useCallback((textShapes: KonvaTextShape[]) => {
  //   if (!drawingCanvasRef.current) return;
  //   const ctx = drawingCanvasRef.current.getContext("2d");
  //   if (!ctx) return;

  //   textShapes.forEach((t) => {
  //     ctx.save();

  //     // Create a temporary element to measure text dimensions
  //     const textNode = document.createElement("span");
  //     textNode.innerText = t.text;
  //     textNode.style.fontSize = `${t.fontSize}px`;
  //     textNode.style.fontFamily = t.fontFamily;
  //     textNode.style.position = "absolute";
  //     textNode.style.visibility = "hidden";
  //     document.body.appendChild(textNode);

  //     // Get dimensions with padding
  //     const padding = 10;
  //     const width = textNode.offsetWidth + padding * 2;
  //     const height = textNode.offsetHeight + padding * 2;

  //     document.body.removeChild(textNode);

  //     // Draw background with rounded corners
  //     if (t.backgroundColor && t.backgroundColor !== "transparent") {
  //       ctx.fillStyle = t.backgroundColor;

  //       // Draw rounded rectangle
  //       const radius = 10; // Same as cornerRadius in the Rect component
  //       const x = t.x;
  //       const y = t.y;

  //       ctx.beginPath();
  //       ctx.moveTo(x + radius, y);
  //       ctx.lineTo(x + width - radius, y);
  //       ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  //       ctx.lineTo(x + width, y + height - radius);
  //       ctx.quadraticCurveTo(
  //         x + width,
  //         y + height,
  //         x + width - radius,
  //         y + height
  //       );
  //       ctx.lineTo(x + radius, y + height);
  //       ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  //       ctx.lineTo(x, y + radius);
  //       ctx.quadraticCurveTo(x, y, x + radius, y);
  //       ctx.closePath();
  //       ctx.fill();
  //     }

  //     // Draw text on top of background
  //     ctx.font = `${t.fontSize}px ${t.fontFamily}`;
  //     ctx.fillStyle = t.fill;
  //     ctx.fillText(t.text, t.x + padding, t.y + padding + t.fontSize); // Add padding to position text

  //     ctx.restore();
  //   });

  //   setTexts([]);
  //   saveHistory();
  // }, []);

  const handleKonvaCircleFlatten = useCallback(
    (circleShapes: KonvaCircleShape[]) => {
      if (!drawingCanvasRef.current) return;
      const ctx = drawingCanvasRef.current.getContext("2d");
      if (!ctx) return;
      circleShapes.forEach((c) => {
        ctx.save();
        ctx.strokeStyle = c.stroke;
        ctx.lineWidth = c.strokeWidth ?? 1;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
      });
      setCircles([]);
      saveHistory();
    },
    []
  );

  const handleTextFlatten = useCallback((textShapes: KonvaTextShape[]) => {
    if (!drawingCanvasRef.current) return;
    const ctx = drawingCanvasRef.current.getContext("2d");
    if (!ctx) return;

    textShapes.forEach((t) => {
      ctx.save();

      // Apply scaling transformations
      const scaleX = t.scaleX || 1;
      const scaleY = t.scaleY || 1;

      // Calculate scaled font size and padding
      const scaledFontSize = t.fontSize * scaleY;
      const padding = 10 * Math.min(scaleX, scaleY); // Use minimum scale for consistent padding

      // Create a temporary element to measure text dimensions with scaled font
      const textNode = document.createElement("span");
      textNode.innerText = t.text;
      textNode.style.fontSize = `${scaledFontSize}px`;
      textNode.style.fontFamily = t.fontFamily;
      textNode.style.position = "absolute";
      textNode.style.visibility = "hidden";
      document.body.appendChild(textNode);

      // Get dimensions with scaled padding
      const width = (textNode.offsetWidth + padding * 2) * scaleX;
      const height = (textNode.offsetHeight + padding * 2) * scaleY;

      document.body.removeChild(textNode);

      // Draw background with rounded corners if specified
      if (t.backgroundColor && t.backgroundColor !== "transparent") {
        ctx.fillStyle = t.backgroundColor;

        // Draw rounded rectangle with scaling
        const radius = 10 * Math.min(scaleX, scaleY); // Scale the radius
        const x = t.x;
        const y = t.y;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(
          x + width,
          y + height,
          x + width - radius,
          y + height
        );
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
      }

      // Draw text on top of background with scaling
      ctx.font = `${scaledFontSize}px ${t.fontFamily}`;
      ctx.fillStyle = t.fill;

      // Position text with scaled padding and baseline adjustment
      const textX = t.x + padding;
      const textY = t.y + padding + scaledFontSize;

      ctx.fillText(t.text, textX, textY);

      ctx.restore();
    });

    setTexts([]);
    saveHistory();
  }, []);

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
      // Get container element and calculate responsive dimensions
      const container = baseCanvas.parentElement;
      if (!container) return;

      const isMobile = window.innerWidth < 1024;

      let canvasWidth, canvasHeight;

      if (isMobile) {
        // On mobile, use full container dimensions
        const containerRect = container.getBoundingClientRect();
        canvasWidth = containerRect.width;
        canvasHeight = containerRect.height;
      } else {
        // On desktop, use fixed dimensions
        canvasWidth = 420;
        canvasHeight = 750;
      }

      // Set canvas dimensions
      baseCanvas.width = canvasWidth;
      baseCanvas.height = canvasHeight;
      drawingCanvas.width = canvasWidth;
      drawingCanvas.height = canvasHeight;

      // Clear both canvases
      baseCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      drawingCtx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Calculate aspect ratio and contain the image
      const imageAspectRatio = img.naturalWidth / img.naturalHeight;
      const canvasAspectRatio = canvasWidth / canvasHeight;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (imageAspectRatio > canvasAspectRatio) {
        // Image is wider - fit by width
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / imageAspectRatio;
        offsetX = 0;
        offsetY = (canvasHeight - drawHeight) / 2;
      } else {
        // Image is taller - fit by height
        drawWidth = canvasHeight * imageAspectRatio;
        drawHeight = canvasHeight;
        offsetX = (canvasWidth - drawWidth) / 2;
        offsetY = 0;
      }

      // Draw the image contained within the canvas
      baseCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      drawingCtx.globalCompositeOperation = "source-over";

      setImageDrawParams({
        offsetX,
        offsetY,
        drawWidth,
        drawHeight,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      });

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

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      // Redraw canvas with new dimensions on resize
      if (baseCanvasRef.current && drawingCanvasRef.current) {
        drawImageOnCanvas();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, drawImageOnCanvas]);

  function saveHistory() {
    const drawingCanvas = drawingCanvasRef.current;
    const ctx = drawingCanvas?.getContext("2d");
    if (!drawingCanvas || !ctx) return;
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(
      ctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height)
    );
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }

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
    // If leaving rectangle tool, flatten rectangles before switching
    if (activeTool === "rectangle" && konvaRectRef.current) {
      konvaRectRef.current.flatten();
    }

    // If leaving circle tool, flatten circles before switching
    if (activeTool === "circle" && konvaCircleRef.current) {
      konvaCircleRef.current.flatten();
    }

    // If leaving arrow tool, flatten arrows before switching
    if (activeTool === "arrow" && konvaArrowRef.current) {
      konvaArrowRef.current.flatten();
    }

    // If leaving double-arrow tool, flatten double arrows before switching
    if (activeTool === "double-arrow" && konvaDoubleArrowRef.current) {
      konvaDoubleArrowRef.current.flatten();
    }

    if (activeTool === "text" && textEditorRef.current) {
      textEditorRef.current.flatten();
    }
    // Clean up crop tool state
    if (tool === "crop") {
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
    if (tool === "text") {
      setTextInputPosition(null);
      setText("");
    }

    setIsTextToolActive(tool === "text");
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
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    // return {
    //   x: ((clientX - rect.left) / rect.width) * canvas.width,
    //   y: ((clientY - rect.top) / rect.height) * canvas.height,
    // };
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
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

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
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

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
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

    if (konvaRectRef.current) {
      konvaRectRef.current.flatten();
    }
    if (konvaCircleRef.current) {
      konvaCircleRef.current.flatten();
    }
    if (konvaArrowRef.current) {
      konvaArrowRef.current.flatten();
    }
    if (konvaDoubleArrowRef.current) {
      konvaDoubleArrowRef.current.flatten();
    }
    if (textEditorRef.current) {
      textEditorRef.current.flatten();
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
      <DialogContent className="flex flex-col lg:max-w-5xl h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b hidden sm:block">
          <DialogTitle>Edit Image: {image.name}</DialogTitle>
        </DialogHeader>

        {/* Main content area: Controls on left (responsive), Canvas on right */}
        <div className="flex flex-col lg:flex-row flex-grow overflow-hidden">
          {/* --- Large Screen Controls (Left Panel) --- */}
          {/* This section is visible only on screens larger than 'lg'. */}
          <div className="hidden lg:flex flex-col lg:w-52 lg:flex-shrink-0 lg:border-r p-2 gap-2 overflow-y-auto">
            {/* Large Screen Tools Grid */}

            {/* Undo/Redo Buttons for large screens */}
            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={undo}
                disabled={historyStep <= 0}
                title="Undo"
                className="flex items-center gap-2 p-3"
              >
                <Undo2 className="h-4 w-4" />
                Undo
              </Button>
              <Button
                variant="outline"
                onClick={redo}
                disabled={historyStep >= history.length - 1}
                title="Redo"
                className="flex items-center gap-2 p-3"
              >
                <Redo2 className="h-4 w-4" /> Redo
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={activeTool === "pencil" ? "secondary" : "ghost"}
                onClick={() => handleToolChange("pencil")}
                className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
              >
                <Pencil className="h-4 w-4" /> Pencil
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
                  (activeTool as DrawingTool) === "text" ? "secondary" : "ghost"
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
                variant={activeTool === "double-arrow" ? "secondary" : "ghost"}
                onClick={() => handleToolChange("double-arrow")}
                className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
              >
                <ArrowRightLeft className="h-4 w-4" /> Double <br></br> Arrow
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
                  const drawingCanvas = drawingCanvasRef.current;
                  const ctx = drawingCanvas?.getContext("2d");
                  if (!drawingCanvas || !ctx) return;
                  const imageData = ctx.getImageData(
                    0,
                    0,
                    drawingCanvas.width,
                    drawingCanvas.height
                  ).data;
                  const hasChanges = imageData.some((pixel, index) => {
                    return index % 4 === 3 && pixel !== 0;
                  });
                  if (hasChanges) {
                    setShowCropConfirm(true);
                  } else {
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
                  const drawingCanvas = drawingCanvasRef.current;
                  const ctx = drawingCanvas?.getContext("2d");
                  if (!drawingCanvas || !ctx) return;
                  const imageData = ctx.getImageData(
                    0,
                    0,
                    drawingCanvas.width,
                    drawingCanvas.height
                  ).data;
                  const hasChanges = imageData.some((pixel, index) => {
                    return index % 4 === 3 && pixel !== 0;
                  });
                  if (hasChanges) {
                    setShowCurveConfirm(true);
                  } else {
                    setActiveTool("curve");
                  }
                }}
                className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
              >
                <PenTool className="h-4 w-4" /> Curve
              </Button>
              <Button
                variant={activeTool === "curve-arrow" ? "secondary" : "ghost"}
                onClick={() => {
                  const drawingCanvas = drawingCanvasRef.current;
                  const ctx = drawingCanvas?.getContext("2d");
                  if (!drawingCanvas || !ctx) return;
                  const imageData = ctx.getImageData(
                    0,
                    0,
                    drawingCanvas.width,
                    drawingCanvas.height
                  ).data;
                  const hasChanges = imageData.some((pixel, index) => {
                    return index % 4 === 3 && pixel !== 0;
                  });
                  if (hasChanges) {
                    setShowCurveArrowConfirm(true);
                  } else {
                    setActiveTool("curve-arrow");
                  }
                }}
                className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
              >
                <PenTool className="h-4 w-4" /> Curve <br></br> Arrow
              </Button>
            </div>

            {/* Confirmation dialog for crop */}
            {showCropConfirm && (
              <div className="space-y-4 mt-2">
                <p className="text-[12px] text-muted-foreground">
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
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setShowCropConfirm(false)}
                    className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Confirmation dialog for curve */}
            {showCurveConfirm && (
              <div className="space-y-4 mt-2">
                <p className="text-[12px] text-muted-foreground">
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

            {showCurveArrowConfirm && (
              <div className="space-y-4 mt-2">
                <p className="text-[12px] text-muted-foreground">
                  These changes till now will be saved and they cannot be undone
                  after drawing a new curve. You can make new changes after
                  drawing the curve.
                </p>
                <div className="flex flex-col gap-2 flex-wrap">
                  <Button
                    type="button"
                    onClick={() => {
                      flattenLayers();
                      setActiveTool("curve-arrow");
                      setShowCurveArrowConfirm(false);
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
                    onClick={() => setShowCurveArrowConfirm(false)}
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

            {activeTool &&
              ["text", "rectangle", "curcle"].includes(activeTool) && (
                <div className="space-y-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="backgroundColor" className="text-sm">
                      Background Color
                    </Label>
                    <input
                      id="backgroundColor"
                      type="color"
                      value={backgroundColor || "transparent"}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="rounded-full w-6 h-6"
                    />
                  </div>

                  <p className="text-sm text-muted-foreground mt-2">
                    Click on the canvas to add text
                  </p>
                </div>
              )}

            {/* Color dropdown for large screens */}
            <div className="flex items-center justify-start gap-2 mt-4">
              <Label
                htmlFor="color-picker-lg"
                className="flex items-center gap-2"
              >
                <Palette className="h-4 w-4" /> Color
              </Label>
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                className="rounded-full w-12 h-6"
              />
            </div>

            {/* Brush size for large screens */}
            <div className="mt-4">
              <Label htmlFor="brush-size-lg" className="mb-2 block">
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
                  id="brush-size-lg"
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

          <div className="flex-1 flex items-center justify-center bg-gray-100 min-h-0 relative">
            <div
              className="relative border-2 border-gray-300 w-full h-full lg:w-[420px] lg:h-[750px]"
              id="drawing-canvas"
            >
              <canvas
                ref={baseCanvasRef}
                className="absolute bg-white object-contain w-full h-full"
              />
              <canvas
                ref={drawingCanvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute w-full h-full"
                style={{
                  cursor:
                    activeTool === "text"
                      ? "text"
                      : activeTool === null
                      ? "default"
                      : "crosshair",
                }}
              />
              {mounted && activeTool === "rectangle" && (
                <KonvaRectangle
                  ref={konvaRectRef}
                  width={drawingCanvasRef.current?.width || 420}
                  height={drawingCanvasRef.current?.height || 750}
                  active={activeTool === "rectangle"}
                  color={currentColor}
                  brushSize={brushSize}
                  rectangles={rectangles}
                  setRectangles={setRectangles}
                  onFlatten={handleKonvaRectFlatten}
                />
              )}

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

              {activeTool === "curve-arrow" && (
                <CurveArrowTool
                  active={activeTool === "curve-arrow"}
                  canvasRef={drawingCanvasRef}
                  currentColor={currentColor}
                  setActiveTool={setActiveTool}
                  strokeStyle={strokeStyle}
                  brushSize={brushSize}
                />
              )}

              {mounted && activeTool === "circle" && (
                <KonvaCircle
                  ref={konvaCircleRef}
                  width={drawingCanvasRef.current?.width || 800}
                  height={drawingCanvasRef.current?.height || 600}
                  active={activeTool === "circle"}
                  color={currentColor}
                  brushSize={brushSize}
                  circles={circles}
                  setCircles={setCircles} // Use history-aware setter
                  onFlatten={handleKonvaCircleFlatten}
                />
              )}

              {mounted && activeTool === "arrow" && (
                <ArrowKonva
                  ref={konvaArrowRef}
                  width={drawingCanvasRef.current?.width || 800}
                  height={drawingCanvasRef.current?.height || 600}
                  active={activeTool === "arrow"}
                  color={currentColor}
                  brushSize={brushSize}
                  arrows={arrows}
                  setArrows={setArrows} // Use history-aware setter
                  onFlatten={handleKonvaArrowFlatten}
                />
              )}

              {mounted && activeTool === "double-arrow" && (
                <KonvaDoubleArrow
                  ref={konvaDoubleArrowRef}
                  width={drawingCanvasRef.current?.width || 800}
                  height={drawingCanvasRef.current?.height || 600}
                  active={activeTool === "double-arrow"}
                  color={currentColor}
                  brushSize={brushSize}
                  arrows={doubleArrows}
                  setArrows={setDoubleArrows} // Use history-aware setter
                  onFlatten={handleKonvaDoubleArrowFlatten}
                />
              )}

              {mounted && activeTool === "text" && (
                <TextEditor
                  ref={textEditorRef}
                  width={drawingCanvasRef.current?.width || 420}
                  height={drawingCanvasRef.current?.height || 750}
                  active={activeTool === "text"}
                  color={currentColor}
                  backgroundColor={backgroundColor}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  texts={texts}
                  setTexts={setTexts}
                  onFlatten={handleTextFlatten}
                />
              )}
            </div>
          </div>

          <div className="lg:hidden">
            <MobileView
              undo={undo}
              historyStep={historyStep}
              redo={redo}
              setActiveTool={setActiveTool}
              activeTool={activeTool}
              drawingCanvasRef={drawingCanvasRef}
              handleToolChange={handleToolChange}
              currentColor={currentColor}
              setCurrentColor={setCurrentColor}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              minBrushSize={minBrushSize}
              maxBrushSize={maxBrushSize}
              showCropConfirm={showCropConfirm}
              setShowCropConfirm={setShowCropConfirm}
              showCurveConfirm={showCurveConfirm}
              setShowCurveConfirm={setShowCurveConfirm}
              showCurveArrowConfirm={showCurveArrowConfirm}
              setShowCurveArrowConfirm={setShowCurveArrowConfirm}
              flattenLayers={flattenLayers}
              applyCrop={applyCrop}
              cropArea={cropArea}
              setCropArea={setCropArea}
              strokeStyle={strokeStyle}
              setStrokeStyle={setStrokeStyle}
            />
          </div>
        </div>

        {/* Dialog Footer - 2x2 grid for buttons */}
        <DialogFooter className="p-2 sm:p-4 border-t flex justify-end flex-row gap-2">
          <Button
            variant={"outline"}
            onClick={applyBlackAndWhite}
            className="flex items-center text-[12px] w-max"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:block">Apply Filter</span>
          </Button>
          <Button
            variant={"secondary"}
            onClick={downloadImage}
            type="button"
            className="flex items-center text-[12px] w-max"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:block">Download</span>
          </Button>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex items-center text-[12px] w-max"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSave}
            className="flex items-center text-[12px] w-max"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
