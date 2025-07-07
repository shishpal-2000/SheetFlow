"use client";

import type { IssueImage } from "@/types";
import type { KonvaArrow } from "./ArrowKonva";
import type { KonvaCircleShape } from "./KonvaCircle";
import type { KonvaTextShape } from "./TextEditor";

import { GrClear } from "react-icons/gr";

import React, { useState, useRef, useEffect, useCallback } from "react";

import dynamic from "next/dynamic";
const TextEditor = dynamic(() => import("./TextEditor"), {
  ssr: false,
  loading: () => <div>Loading Text Editor...</div>,
});
const KonvaRectangle = dynamic(() => import("./KonvaRectangle"), {
  ssr: false,
  loading: () => <div>Loading Rectangle Tool...</div>,
});
const ArrowKonva = dynamic(() => import("./ArrowKonva"), {
  ssr: false,
  loading: () => <div>Loading Arrow Tool...</div>,
});

const KonvaCircle = dynamic(() => import("./KonvaCircle"), {
  ssr: false,
  loading: () => <div>Loading Circle Tool...</div>,
});

const KonvaDoubleArrow = dynamic(() => import("./KonvaDoubleArrow"), {
  ssr: false,
  loading: () => <div>Loading Circle Tool...</div>,
});

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Trash2,
} from "lucide-react";
import { CurveTool } from "./CurveTool";
import CurveArrowTool from "./CurveArrowTool";
import MobileView from "./MobileView";
import { TbArrowCurveRight } from "react-icons/tb";
import { useHistoryManager } from "@/hooks/useHistoryManager";
import { DrawingAction } from "@/types/history";
import { ActionCreators } from "@/utils/actionCreators";
import { set } from "date-fns";

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

export type StrokeStyle = "solid" | "dashed" | "dotted";
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
  | "text"
  | "curve"
  | "curve-arrow"
  | "crop";

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
  const [fontSize, setFontSize] = useState<number>(22);
  const [textInputPosition, setTextInputPosition] = useState<Point | null>(
    null
  );
  const [text, setText] = useState("");
  const [isTextToolActive, setIsTextToolActive] = useState(false);
  const [showCropConfirm, setShowCropConfirm] = useState(false);
  const [showCurveConfirm, setShowCurveConfirm] = useState(false);
  const [showCurveArrowConfirm, setShowCurveArrowConfirm] = useState(false);
  const { toast } = useToast();
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  const {
    historyState,
    canUndo,
    canRedo,
    undo,
    redo,
    actionCount,
    addAction,
    createAction,

    replayManager,

    rectangles,
    setRectangles,
    circles,
    setCircles,
    arrows,
    setArrows,
    doubleArrows,
    setDoubleArrows,
    texts,
    setTexts,

    // get refs from history manager
    konvaRectRef,
    konvaCircleRef,
    konvaArrowRef,
    konvaDoubleArrowRef,
    textEditorRef,
  } = useHistoryManager({
    drawingCanvasRef,
    baseCanvasRef,
  });

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

  // Mobile view state for delete
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null
  );
  const [selectedElementType, setSelectedElementType] = useState<string | null>(
    null
  );
  const [showTrashIcon, setShowTrashIcon] = useState(false);
  const [isDraggedOverTrash, setIsDraggedOverTrash] = useState(false);

  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 420,
    height: 750,
  });

  const [imageDrawParams, setImageDrawParams] = useState<{
    offsetX: number;
    offsetY: number;
    drawWidth: number;
    drawHeight: number;
    naturalWidth: number;
    naturalHeight: number;
  } | null>(null);

  const [mounted, setMounted] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [eraserCursor, setEraserCursor] = useState<Point | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEraserCursorMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (activeTool !== "eraser") return;
    const pos = getMousePos(e);
    setEraserCursor(pos);
  };

  const handleEraserCursorHide = () => {
    setEraserCursor(null);
  };

  // Debugging: Log history state changes
  useEffect(() => {
    console.log("History state updated:", {
      totalActions: historyState.actions.length,
      konvaActions: historyState.actions.filter((a) => a.target === "konva")
        .length,
      drawingActions: historyState.actions.filter((a) => a.target === "drawing")
        .length,
      baseActions: historyState.actions.filter((a) => a.target === "base")
        .length,
    });
  }, [historyState.actions]);

  useEffect(() => {
    if (activeTool === "eraser") {
      setBrushSize(20);
    } else {
      setBrushSize(3);
    }
  }, [activeTool]);

  useEffect(() => {
    const checkScreenSize = () => {
      const isMobile = window.innerWidth < 1024; // lg breakpoint
      setShowTrashIcon(isMobile && selectedElementId !== null);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, [selectedElementId]);

  // Update canvas dimensions whenever they change
  useEffect(() => {
    const updateDimensions = () => {
      const drawingCanvas = drawingCanvasRef.current;
      if (drawingCanvas) {
        setCanvasDimensions({
          width: drawingCanvas.width,
          height: drawingCanvas.height,
        });
      }
    };

    // Initial update
    updateDimensions();

    // Create a ResizeObserver to watch for canvas size changes
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas) {
      const resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(drawingCanvas);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  const handleKonvaRectAdd = useCallback(
    (rectangle: any) => {
      console.log("Recording rectangle action:", rectangle);
      const action = createAction("konva", "ADD_RECTANGLE", {
        elementType: "rectangle",
        elementId: rectangle.id,
        data: { ...rectangle, _createdAt: Date.now() },
      });
      addAction(action);
    },
    [createAction, addAction]
  );

  const handleKonvaRectMove = useCallback(
    (id: string, newData: any, previousData: any) => {
      console.log("Recording rectangle move action:", {
        id,
        newData,
        previousData,
      });
      const action = createAction("konva", "MOVE_ELEMENT", {
        elementType: "rectangle",
        elementId: id,
        data: newData,
        previousData: previousData,
      });
      addAction(action);
    },
    [createAction, addAction]
  );

  const handleKonvaCircleMove = useCallback(
    (id: string, newData: any, previousData: any) => {
      console.log("Recording circle move action:", {
        id,
        newData,
        previousData,
      });
      const action = createAction("konva", "MOVE_ELEMENT", {
        elementType: "circle",
        elementId: id,
        data: newData,
        previousData: previousData,
      });
      addAction(action);
    },
    [createAction, addAction]
  );

  const handleKonvaArrowMove = useCallback(
    (id: string, newData: any, previousData: any) => {
      console.log("Recording arrow move action:", {
        id,
        newData,
        previousData,
      });
      const action = createAction("konva", "MOVE_ELEMENT", {
        elementType: "arrow",
        elementId: id,
        data: newData,
        previousData: previousData,
      });
      addAction(action);
    },
    [createAction, addAction]
  );

  const handleKonvaDoubleArrowMove = useCallback(
    (id: string, newData: any, previousData: any) => {
      console.log("Recording double arrow move action:", {
        id,
        newData,
        previousData,
      });
      const action = createAction("konva", "MOVE_ELEMENT", {
        elementType: "double-arrow",
        elementId: id,
        data: newData,
        previousData: previousData,
      });
      addAction(action);
    },
    [createAction, addAction]
  );

  const handleKonvaTextMove = useCallback(
    (id: string, newData: any, previousData: any) => {
      console.log("Recording text move action:", {
        id,
        newData,
        previousData,
      });
      const action = createAction("konva", "MOVE_ELEMENT", {
        elementType: "text",
        elementId: id,
        data: newData,
        previousData: previousData,
      });
      addAction(action);
    },
    [createAction, addAction]
  );

  const handleKonvaCircleAdd = useCallback(
    (circle: any) => {
      console.log("Recording circle action:", circle);
      const action = createAction("konva", "ADD_CIRCLE", {
        elementType: "circle",
        elementId: circle.id,
        data: { ...circle, _createdAt: Date.now() },
      });
      addAction(action);
    },
    [createAction, addAction]
  );

  const handleKonvaArrowAdd = useCallback(
    (arrow: any) => {
      console.log("Recording arrow action:", arrow);
      const action = createAction("konva", "ADD_ARROW", {
        elementType: "arrow",
        elementId: arrow.id,
        data: { ...arrow, _createdAt: Date.now() },
      });
      addAction(action);
    },
    [createAction, addAction]
  );

  const handleKonvaDoubleArrowAdd = useCallback(
    (doubleArrow: any) => {
      console.log("Recording double arrow action:", doubleArrow);
      const action = createAction("konva", "ADD_DOUBLE_ARROW", {
        elementType: "double-arrow",
        elementId: doubleArrow.id,
        data: { ...doubleArrow, _createdAt: Date.now() },
      });
      addAction(action);
    },
    [createAction, addAction]
  );

  const handleKonvaTextAdd = useCallback(
    (text: any) => {
      console.log("Recording text action:", text);
      const action = createAction("konva", "ADD_TEXT", {
        elementType: "text",
        elementId: text.id,
        data: { ...text, _createdAt: Date.now() },
      });
      addAction(action);
    },
    [createAction, addAction]
  );

  const handleKonvaRectFlatten = useCallback(
    (rects: any[]) => {
      if (!drawingCanvasRef.current) return;
      const ctx = drawingCanvasRef.current.getContext("2d");
      if (!ctx) return;

      // Record action for each rectangle before flattening
      // rects.forEach((rect) => {
      //   const action = createAction("konva", "ADD_RECTANGLE", {
      //     elementType: "rectangle",
      //     elementId: rect.id,
      //     data: rect,
      //   });
      //   addAction(action);
      // });

      // rects.forEach((r: any) => {
      //   ctx.save(); // Save current state

      //   // Set stroke style
      //   ctx.strokeStyle = r.stroke;
      //   ctx.lineWidth = r.strokeWidth;
      //   ctx.fillStyle = r.fill || "transparent";

      //   // Apply dash pattern based on stroke style
      //   if (r.dash && r.dash.length > 0) {
      //     ctx.setLineDash(r.dash);
      //   } else {
      //     ctx.setLineDash([]);
      //   }

      //   if (r.rotation) {
      //     // For rectangles with rotation
      //     const centerX = r.x + r.width / 2;
      //     const centerY = r.y + r.height / 2;

      //     // Move to rectangle center, rotate, draw centered rectangle
      //     ctx.translate(centerX, centerY);
      //     ctx.rotate((r.rotation * Math.PI) / 180);
      //     ctx.fillRect(-r.width / 2, -r.height / 2, r.width, r.height);
      //     ctx.strokeRect(-r.width / 2, -r.height / 2, r.width, r.height);
      //   } else {
      //     // For rectangles without rotation - draw directly
      //     ctx.fillRect(r.x, r.y, r.width, r.height);
      //     ctx.strokeRect(r.x, r.y, r.width, r.height);
      //   }

      //   ctx.restore(); // Restore original state
      // });

      rects.forEach((r: any) => {
        ctx.save();
        ctx.strokeStyle = r.stroke;
        ctx.lineWidth = r.strokeWidth;

        if (r.dash && r.dash.length > 0) {
          ctx.setLineDash(r.dash);
        }

        if (r.fill) {
          ctx.fillStyle = r.fill;
          ctx.fillRect(r.x, r.y, r.width, r.height);
        }

        ctx.strokeRect(r.x, r.y, r.width, r.height);
        ctx.restore();
      });

      setRectangles([]);
      // saveHistory();
    },
    [setRectangles]
  );

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

      const scaleX = drawWidth / naturalWidth;
      const scaleY = drawHeight / naturalHeight;

      // Record action for each double arrow before flattening
      // arrowShapes.forEach((a: any) => {
      //   const action = createAction("konva", "ADD_DOUBLE_ARROW", {
      //     elementType: "double-arrow",
      //     elementId: a.id,
      //     data: a,
      //   });
      //   addAction(action);
      // });

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

        // Apply stroke style
        switch (strokeStyle) {
          case "solid":
            ctx.setLineDash([]);
            break;
          case "dashed":
            ctx.setLineDash([brushSize * 3, brushSize * 2]);
            break;
          case "dotted":
            ctx.setLineDash([brushSize, brushSize]);
            break;
        }

        // Draw main line
        ctx.beginPath();
        ctx.moveTo(drawX1, drawY1);
        ctx.lineTo(drawX2, drawY2);
        ctx.stroke();

        // Draw arrowheads at both ends
        const headlen = 15;
        const angle = Math.atan2(drawY2 - drawY1, drawX2 - drawX1);

        ctx.setLineDash([]); // Reset dash for arrowheads

        // First arrowhead
        ctx.beginPath();
        ctx.moveTo(drawX1, drawY1);
        ctx.lineTo(
          drawX1 + headlen * Math.cos(angle + Math.PI / 7),
          drawY1 + headlen * Math.sin(angle + Math.PI / 7)
        );
        ctx.lineTo(
          drawX1 + headlen * Math.cos(angle - Math.PI / 7),
          drawY1 + headlen * Math.sin(angle - Math.PI / 7)
        );
        ctx.lineTo(drawX1, drawY1);
        ctx.stroke();
        ctx.fillStyle = a.stroke;
        ctx.fill();

        // Second arrowhead
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
        ctx.stroke();
        ctx.fillStyle = a.stroke;
        ctx.fill();

        ctx.restore();
      });
      setDoubleArrows([]);
      // saveHistory();
    },
    [
      imageDrawParams,
      setDoubleArrows,
      strokeStyle,
      brushSize,
      createAction,
      addAction,
    ]
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

      // Record action for each arrow before flattening
      // arrows.forEach((a: KonvaArrow) => {
      //   const action = createAction("konva", "ADD_ARROW", {
      //     elementType: "arrow",
      //     elementId: a.id,
      //     data: a,
      //   });
      //   addAction(action);
      // });

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

        // Apply stroke style
        switch (strokeStyle) {
          case "solid":
            ctx.setLineDash([]);
            break;
          case "dashed":
            ctx.setLineDash([brushSize * 3, brushSize * 2]);
            break;
          case "dotted":
            ctx.setLineDash([brushSize, brushSize]);
            break;
        }

        ctx.beginPath();
        ctx.moveTo(drawX1, drawY1);
        ctx.lineTo(drawX2, drawY2);
        ctx.stroke();

        // Draw arrowhead
        const headlen = 15;
        const angle = Math.atan2(drawY2 - drawY1, drawX2 - drawX1);
        ctx.setLineDash([]); // Reset dash for arrowhead
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
      // saveHistory();
    },
    [
      imageDrawParams,
      setArrows,
      strokeStyle,
      brushSize,
      createAction,
      addAction,
    ]
  );

  const handleKonvaCircleFlatten = useCallback(
    (circleShapes: KonvaCircleShape[]) => {
      if (!drawingCanvasRef.current) return;
      const ctx = drawingCanvasRef.current.getContext("2d");
      if (!ctx) return;

      // Record action for each circle before flattening
      // circleShapes.forEach((c) => {
      //   const action = createAction("konva", "ADD_CIRCLE", {
      //     elementType: "circle",
      //     elementId: c.id,
      //     data: c,
      //   });
      //   addAction(action);
      // });

      circleShapes.forEach((c) => {
        ctx.save();
        ctx.strokeStyle = c.stroke;
        ctx.lineWidth = c.strokeWidth ?? 1;

        // Apply dash pattern based on stroke style
        if (c.dash && c.dash.length > 0) {
          ctx.setLineDash(c.dash);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, 2 * Math.PI);
        if (c.fill && c.fill !== "transparent") {
          ctx.fillStyle = c.fill;
          ctx.fill();
        }
        ctx.stroke();
        ctx.restore();
      });
      setCircles([]);
      // saveHistory();
    },
    [createAction, addAction, setCircles]
  );

  const handleTextFlatten = useCallback(
    (textShapes: KonvaTextShape[]) => {
      if (!drawingCanvasRef.current) return;
      const ctx = drawingCanvasRef.current.getContext("2d");
      if (!ctx) return;

      // Record action for each text shape before flattening
      // textShapes.forEach((t) => {
      //   const action = createAction("konva", "ADD_TEXT", {
      //     elementType: "text",
      //     elementId: t.id,
      //     data: t,
      //   });
      //   addAction(action);
      // });

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
      // saveHistory();
    },
    [drawingCanvasRef, setTexts, addAction, createAction]
  );

  const getCurrentCanvasDimensions = useCallback(() => {
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas) {
      return {
        width: drawingCanvas.width,
        height: drawingCanvas.height,
      };
    }
    return { width: 420, height: 750 }; // fallback
  }, []);

  const checkTrashZoneCollision = useCallback(
    (screenX: number, screenY: number) => {
      const trashZone = document.getElementById("trash-zone");
      if (!trashZone) return false;

      const trashRect = trashZone.getBoundingClientRect();
      const tolerance = 80;

      return (
        screenX >= trashRect.left - tolerance &&
        screenX <= trashRect.right + tolerance &&
        screenY >= trashRect.top - tolerance &&
        screenY <= trashRect.bottom + tolerance
      );
    },
    []
  );

  const updateTrashZoneState = useCallback((isOver: boolean) => {
    setIsDraggedOverTrash(isOver);
  }, []);

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

      // Update the state to trigger Konva re-render
      setCanvasDimensions({
        width: canvasWidth,
        height: canvasHeight,
      });

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

      // Record the initial image load action
      // const imageData = baseCtx.getImageData(0, 0, canvasWidth, canvasHeight);
      // const action = createAction("base", "LOAD_IMAGE", {
      //   imageData,
      //   canvasWidth,
      //   canvasHeight,
      // });
      // addAction(action);

      drawingCtx.globalCompositeOperation = "source-over";

      setImageDrawParams({
        offsetX,
        offsetY,
        drawWidth,
        drawHeight,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      });

      // saveHistory();
    };
    img.onerror = () => {
      console.error("Failed to load image for editing.");
    };
  }, [image.url, createAction, addAction]);

  useEffect(() => {
    if (!isOpen || !image.url) return;

    const timeout = setTimeout(() => {
      if (baseCanvasRef.current && drawingCanvasRef.current) {
        drawImageOnCanvas();
        // setHistory([]);
        // setHistoryStep(-1);
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

  // function saveHistory() {
  //   const drawingCanvas = drawingCanvasRef.current;
  //   const ctx = drawingCanvas?.getContext("2d");
  //   if (!drawingCanvas || !ctx) return;
  //   const newHistory = history.slice(0, historyStep + 1);
  //   newHistory.push(
  //     ctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height)
  //   );
  //   setHistory(newHistory);
  //   setHistoryStep(newHistory.length - 1);
  // }

  // const undo = useCallback(() => {
  //   if (historyStep > 0) {
  //     const newStep = historyStep - 1;
  //     setHistoryStep(newStep);
  //     const canvas = drawingCanvasRef.current;
  //     const ctx = canvas?.getContext("2d");
  //     if (canvas && ctx) {
  //       ctx.clearRect(0, 0, canvas.width, canvas.height);
  //       if (newStep >= 0) {
  //         ctx.putImageData(history[newStep], 0, 0);
  //       }
  //     }
  //   }
  // }, [historyStep, history]);

  // const redo = useCallback(() => {
  //   if (historyStep < history.length - 1) {
  //     const newStep = historyStep + 1;
  //     setHistoryStep(newStep);
  //     const canvas = drawingCanvasRef.current;
  //     const ctx = canvas?.getContext("2d");
  //     if (canvas && ctx) {
  //       ctx.putImageData(history[newStep], 0, 0);
  //     }
  //   }
  // }, [historyStep, history]);

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

    // Store the current image data before applying filter (for undo)
    const previousImageData = ctx.getImageData(
      0,
      0,
      baseCanvas.width,
      baseCanvas.height
    );

    // Create a copy for applying the filter
    const newImageData = ctx.createImageData(
      baseCanvas.width,
      baseCanvas.height
    );
    newImageData.data.set(previousImageData.data);

    // Convert to grayscale
    const data = newImageData.data;
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

    // Apply the filter to the canvas
    ctx.putImageData(newImageData, 0, 0);

    // Create action for history with before and after states
    const action = ActionCreators.applyFilter(
      "blackAndWhite",
      previousImageData,
      newImageData
    );
    addAction(action);
  };

  const hasDrawingCanvasContent = useCallback(() => {
    const drawingCanvas = drawingCanvasRef.current;
    const ctx = drawingCanvas?.getContext("2d");
    if (!drawingCanvas || !ctx) return false;

    const imageData = ctx.getImageData(
      0,
      0,
      drawingCanvas.width,
      drawingCanvas.height
    );
    return imageData.data.some((pixel, index) => {
      return index % 4 === 3 && pixel !== 0; // Check alpha channel
    });
  }, []);

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

  const hasUnsavedChanges =
    hasDrawingCanvasContent() ||
    rectangles.length > 0 ||
    texts.length > 0 ||
    arrows.length > 0 ||
    circles.length > 0 ||
    doubleArrows.length > 0 ||
    Pencil.length > 0 ||
    textInputPosition !== null ||
    cropArea !== null;

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    onClose();
  };

  const handleToolChange = (tool: DrawingTool) => {
    const drawingCanvas = drawingCanvasRef.current;
    const ctx = drawingCanvas?.getContext("2d");
    let currentDrawingState: ImageData | null = null;

    if (drawingCanvas && ctx) {
      // Save current drawing canvas state
      currentDrawingState = ctx.getImageData(
        0,
        0,
        drawingCanvas.width,
        drawingCanvas.height
      );
    }

    if (activeTool === "eraser") {
      setBrushSize(10);
    } else if (activeTool === "pencil") {
      setBrushSize(3);
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

    // Clear any active selections when switching tools
    setSelectedElementId(null);
    setSelectedElementType(null);
    setShowTrashIcon(false);
    setIsDraggedOverTrash(false);

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

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    // e.preventDefault();
    const pos = getMousePos(e);

    if (activeTool === "text") {
      setTextInputPosition(pos);
      return;
    }

    // Let curve tools handle their own mouse events
    if (activeTool === "curve" || activeTool === "curve-arrow") {
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
    setCurrentStroke([pos]);

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
    // e.preventDefault();
    const currentPos = getMousePos(e);

    if (activeTool === "text" || !isDrawing) return;

    // Let curve tools handle their own mouse events
    if (activeTool === "curve" || activeTool === "curve-arrow") {
      return;
    }

    const drawingCanvas = drawingCanvasRef.current;
    const ctx = drawingCanvas?.getContext("2d");
    if (!drawingCanvas || !ctx) return;

    setCurrentStroke((prev) => [...prev, currentPos]);

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
      if (activeTool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = currentColor;
      }

      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    if (activeTool && ["line"].includes(activeTool) && startPoint) {
      // Clear and redraw with preview
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

      // Replay all existing drawing actions first
      if (replayManager?.current) {
        const existingActions = historyState.actions.filter(
          (action) => action.target === "drawing"
        ) as DrawingAction[];
        existingActions.forEach((action) => {
          replayManager.current!.applyDrawingAction(action);
        });
      }

      // Draw preview
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Apply stroke style
      switch (strokeStyle) {
        case "dashed":
          ctx.setLineDash([brushSize * 3, brushSize * 2]);
          break;
        case "dotted":
          ctx.setLineDash([brushSize, brushSize]);
          break;
        default:
          ctx.setLineDash([]);
      }

      if (activeTool === "line") {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();
      }

      ctx.restore();
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

    // Let curve tools handle their own mouse events
    if (activeTool === "curve" || activeTool === "curve-arrow") {
      return;
    }

    if (!isDrawing) return;
    const ctx = drawingCanvasRef.current?.getContext("2d");

    if (ctx) {
      if (activeTool && ["pencil", "eraser"].includes(activeTool)) {
        ctx.closePath();
        ctx.globalCompositeOperation = "source-over";

        // Record the drawing action using the new history system
        if (currentStroke.length > 0) {
          const action = createAction(
            "drawing",
            activeTool === "pencil" ? "DRAW_PENCIL" : "DRAW_ERASER",
            {
              points: currentStroke,
              color: currentColor,
              strokeWidth: brushSize,
              strokeStyle,
              isEraser: activeTool === "eraser",
            }
          );
          addAction(action);

          // Clear the canvas after adding action - let history replay handle rendering
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
      } else if (activeTool && startPoint) {
        // Handle other tools (line, etc.)
        const endPoint = currentStroke[currentStroke.length - 1] || startPoint;

        if (activeTool === "line") {
          const action = createAction("drawing", "DRAW_LINE", {
            points: [startPoint, endPoint],
            color: currentColor,
            strokeWidth: brushSize,
            strokeStyle,
            startPoint,
            endPoint,
            isEraser: false,
          });
          addAction(action);

          // Clear the canvas after adding action - let history replay handle rendering
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
      }

      setIsDrawing(false);
      setStartPoint(null);
      setCurrentStroke([]);
      // saveHistory();
    }
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

  const applyCrop = useCallback(() => {
    if (!cropArea || !baseCanvasRef.current) return;
    const baseCanvas = baseCanvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    const baseCtx = baseCanvas.getContext("2d");
    const drawingCtx = drawingCanvas?.getContext("2d");
    const imageData = baseCtx?.getImageData(
      0,
      0,
      baseCanvas.width,
      baseCanvas.height
    );
    if (!baseCtx || !drawingCtx || !drawingCanvas) return;

    // Ensure crop dimensions are positive and within canvas bounds
    const validCropArea = {
      x: Math.max(0, Math.min(cropArea.x, baseCanvas.width)),
      y: Math.max(0, Math.min(cropArea.y, baseCanvas.height)),
      width: Math.min(cropArea.width, baseCanvas.width - cropArea.x),
      height: Math.min(cropArea.height, baseCanvas.height - cropArea.y),
    };

    // save current state before cropping
    if (imageData) {
      const action = createAction("base", "CROP_IMAGE", {
        cropArea: validCropArea,
        imageData,
      });
      addAction(action);
    }

    // Create temporary canvases for both base and drawing layers
    const tempBaseCanvas = document.createElement("canvas");
    const tempDrawingCanvas = document.createElement("canvas");
    tempBaseCanvas.width = validCropArea.width;
    tempBaseCanvas.height = validCropArea.height;
    tempDrawingCanvas.width = validCropArea.width;
    tempDrawingCanvas.height = validCropArea.height;

    const tempBaseCtx = tempBaseCanvas.getContext("2d");
    const tempDrawingCtx = tempDrawingCanvas.getContext("2d");
    if (!tempBaseCtx || !tempDrawingCtx) return;

    // Copy the cropped portions to the temp canvases
    tempBaseCtx.drawImage(
      baseCanvas,
      validCropArea.x,
      validCropArea.y,
      validCropArea.width,
      validCropArea.height,
      0,
      0,
      validCropArea.width,
      validCropArea.height
    );

    // For the drawing canvas, we need to be careful not to copy the crop overlay
    // Check if the drawing canvas has actual drawing content (not just overlay)
    const drawingImageData = drawingCtx.getImageData(
      0,
      0,
      drawingCanvas.width,
      drawingCanvas.height
    );
    const hasActualDrawing = drawingImageData.data.some((value, index) => {
      // Look for fully opaque pixels (not semi-transparent overlay pixels)
      return index % 4 === 3 && value === 255;
    });

    if (!hasActualDrawing) {
      tempDrawingCtx.drawImage(
        baseCanvas,
        validCropArea.x,
        validCropArea.y,
        validCropArea.width,
        validCropArea.height,
        0,
        0,
        validCropArea.width,
        validCropArea.height
      );
    }

    // Resize both canvases
    baseCanvas.width = tempBaseCanvas.width;
    baseCanvas.height = tempBaseCanvas.height;
    drawingCanvas.width = tempDrawingCanvas.width;
    drawingCanvas.height = tempDrawingCanvas.height;

    // Clear both canvases completely
    baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

    // Reset composite operations to default
    baseCtx.globalCompositeOperation = "source-over";
    drawingCtx.globalCompositeOperation = "source-over";

    // Draw the cropped images back
    baseCtx.drawImage(tempBaseCanvas, 0, 0);

    if (hasActualDrawing) {
      drawingCtx.drawImage(tempDrawingCanvas, 0, 0);
    }

    // Update canvas dimensions state to trigger Konva re-render
    setCanvasDimensions({
      width: drawingCanvas.width,
      height: drawingCanvas.height,
    });

    // Clear crop area and reset cropping state
    setCropArea(null);
    setIsCropping(false);
    setDragStart(null);

    setActiveTool(null);

    // Save to history
    // saveHistory();
  }, [cropArea, addAction, createAction]);

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
    // setHistory([]);
    // setHistoryStep(-1);
  }, []);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex flex-col lg:max-w-5xl h-[95vh] p-0 overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
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
                disabled={!canUndo}
                title={`Undo (${actionCount} actions)`}
                className="flex items-center gap-2 p-3"
              >
                <Undo2 className="h-4 w-4" />
                Undo
              </Button>
              <Button
                variant="outline"
                onClick={redo}
                disabled={!canRedo}
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
                  if (hasChanges && activeTool !== "crop") {
                    setShowCropConfirm(true);
                    setShowCurveArrowConfirm(false);
                    setShowCurveConfirm(false);
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
                  setActiveTool("curve");
                }}
                className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
              >
                <PenTool className="h-4 w-4" />
                {/* <Curve className="h-4 w-4" /> */}
                Curve
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
                  setActiveTool("curve-arrow");
                }}
                className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
              >
                <TbArrowCurveRight className="h-4 w-4" />
                Curve <br></br> Arrow
              </Button>
            </div>

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
                    </SelectContent>
                  </Select>
                </div>
              )}

            {activeTool &&
              ["text", "rectangle", "circle"].includes(activeTool) && (
                <div className="flex items-center gap-2 mt-2">
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
                  <GrClear
                    className="h-4 w-4"
                    onClick={() => {
                      setBackgroundColor("transparent");
                    }}
                  />
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

          {/* Canvas area */}
          <div className="flex-1 flex items-center justify-center bg-gray-100 min-h-0 relative overflow-hidden">
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
                onMouseMove={(e) => {
                  draw(e);
                  handleEraserCursorMove(e);
                }}
                onMouseUp={stopDrawing}
                onMouseLeave={(e) => {
                  stopDrawing();
                  handleEraserCursorHide();
                }}
                onTouchStart={startDrawing}
                onTouchMove={(e) => {
                  draw(e);
                  handleEraserCursorMove(e);
                }}
                onTouchEnd={(e) => {
                  stopDrawing();
                  handleEraserCursorHide();
                }}
                className="absolute w-full h-full"
                style={{
                  cursor:
                    activeTool === "text"
                      ? "text"
                      : activeTool === null
                      ? "default"
                      : activeTool === "eraser"
                      ? "none"
                      : "crosshair",
                }}
              />

              {mounted && (
                <>
                  {activeTool === "rectangle" && (
                    <KonvaRectangle
                      ref={konvaRectRef}
                      width={getCurrentCanvasDimensions().width}
                      height={getCurrentCanvasDimensions().height}
                      active={activeTool === "rectangle"}
                      color={currentColor}
                      setColor={setCurrentColor}
                      brushSize={brushSize}
                      setBrushSize={setBrushSize}
                      strokeStyle={strokeStyle}
                      setStrokeStyle={setStrokeStyle}
                      backgroundColor={backgroundColor}
                      setBackgroundColor={setBackgroundColor}
                      onAdd={handleKonvaRectAdd}
                      onMove={handleKonvaRectMove}
                      rectangles={rectangles}
                      setRectangles={setRectangles}
                      onFlatten={handleKonvaRectFlatten}
                      onElementSelect={(id, type) => {
                        setSelectedElementId(id);
                        setSelectedElementType(type);
                      }}
                      onElementDeselect={() => {
                        setSelectedElementId(null);
                        setSelectedElementType(null);
                      }}
                      checkTrashZoneCollision={checkTrashZoneCollision}
                      updateTrashZoneState={updateTrashZoneState}
                    />
                  )}

                  {activeTool === "circle" && (
                    <KonvaCircle
                      ref={konvaCircleRef}
                      width={getCurrentCanvasDimensions().width}
                      height={getCurrentCanvasDimensions().height}
                      active={activeTool === "circle"}
                      color={currentColor}
                      setColor={setCurrentColor}
                      brushSize={brushSize}
                      setBrushSize={setBrushSize}
                      strokeStyle={strokeStyle}
                      setStrokeStyle={setStrokeStyle}
                      circles={circles}
                      backgroundColor={backgroundColor}
                      setBackgroundColor={setBackgroundColor}
                      onAdd={handleKonvaCircleAdd}
                      onMove={handleKonvaCircleMove}
                      setCircles={setCircles} // Use history-aware setter
                      onFlatten={handleKonvaCircleFlatten}
                      onElementSelect={(id, type) => {
                        setSelectedElementId(id);
                        setSelectedElementType(type);
                      }}
                      onElementDeselect={() => {
                        setSelectedElementId(null);
                        setSelectedElementType(null);
                      }}
                      checkTrashZoneCollision={checkTrashZoneCollision}
                      updateTrashZoneState={updateTrashZoneState}
                    />
                  )}

                  {activeTool === "arrow" && (
                    <ArrowKonva
                      ref={konvaArrowRef}
                      width={getCurrentCanvasDimensions().width}
                      height={getCurrentCanvasDimensions().height}
                      active={activeTool === "arrow"}
                      color={currentColor}
                      setColor={setCurrentColor}
                      brushSize={brushSize}
                      setBrushSize={setBrushSize}
                      strokeStyle={strokeStyle}
                      setStrokeStyle={setStrokeStyle}
                      onAdd={handleKonvaArrowAdd}
                      onMove={handleKonvaArrowMove}
                      arrows={arrows}
                      setArrows={setArrows} // Use history-aware setter
                      onFlatten={handleKonvaArrowFlatten}
                      onElementSelect={(id, type) => {
                        setSelectedElementId(id);
                        setSelectedElementType(type);
                      }}
                      onElementDeselect={() => {
                        setSelectedElementId(null);
                        setSelectedElementType(null);
                      }}
                      checkTrashZoneCollision={checkTrashZoneCollision}
                      updateTrashZoneState={updateTrashZoneState}
                    />
                  )}

                  {activeTool === "double-arrow" && (
                    <KonvaDoubleArrow
                      ref={konvaDoubleArrowRef}
                      width={getCurrentCanvasDimensions().width}
                      height={getCurrentCanvasDimensions().height}
                      active={activeTool === "double-arrow"}
                      color={currentColor}
                      setColor={setCurrentColor}
                      brushSize={brushSize}
                      setBrushSize={setBrushSize}
                      strokeStyle={strokeStyle}
                      setStrokeStyle={setStrokeStyle}
                      arrows={doubleArrows}
                      onAdd={handleKonvaDoubleArrowAdd}
                      onMove={handleKonvaDoubleArrowMove}
                      setArrows={setDoubleArrows} // Use history-aware setter
                      onFlatten={handleKonvaDoubleArrowFlatten}
                      onElementSelect={(id, type) => {
                        setSelectedElementId(id);
                        setSelectedElementType(type);
                      }}
                      onElementDeselect={() => {
                        setSelectedElementId(null);
                        setSelectedElementType(null);
                      }}
                      checkTrashZoneCollision={checkTrashZoneCollision}
                      updateTrashZoneState={updateTrashZoneState}
                    />
                  )}

                  {activeTool === "text" && (
                    <TextEditor
                      ref={textEditorRef}
                      width={getCurrentCanvasDimensions().width}
                      height={getCurrentCanvasDimensions().height}
                      active={activeTool === "text"}
                      color={currentColor}
                      setColor={setCurrentColor}
                      backgroundColor={backgroundColor}
                      setBackgroundColor={setBackgroundColor}
                      fontSize={fontSize}
                      fontFamily={fontFamily}
                      onAdd={handleKonvaTextAdd}
                      onMove={handleKonvaTextMove}
                      texts={texts}
                      setTexts={setTexts}
                      onFlatten={handleTextFlatten}
                      onElementSelect={(id, type) => {
                        setSelectedElementId(id);
                        setSelectedElementType(type);
                      }}
                      onElementDeselect={() => {
                        setSelectedElementId(null);
                        setSelectedElementType(null);
                      }}
                      checkTrashZoneCollision={checkTrashZoneCollision}
                      updateTrashZoneState={updateTrashZoneState}
                    />
                  )}

                  {activeTool !== "rectangle" && rectangles.length > 0 && (
                    <KonvaRectangle
                      ref={konvaRectRef}
                      width={getCurrentCanvasDimensions().width}
                      height={getCurrentCanvasDimensions().height}
                      active={false}
                      color={currentColor}
                      setColor={setCurrentColor}
                      brushSize={brushSize}
                      setBrushSize={setBrushSize}
                      strokeStyle={strokeStyle}
                      setStrokeStyle={setStrokeStyle}
                      backgroundColor={backgroundColor}
                      setBackgroundColor={setBackgroundColor}
                      onAdd={handleKonvaRectAdd}
                      onMove={handleKonvaRectMove}
                      rectangles={rectangles}
                      setRectangles={setRectangles}
                      onFlatten={handleKonvaRectFlatten}
                      onElementSelect={(id, type) => {
                        setSelectedElementId(id);
                        setSelectedElementType(type);
                      }}
                      onElementDeselect={() => {
                        setSelectedElementId(null);
                        setSelectedElementType(null);
                      }}
                      checkTrashZoneCollision={checkTrashZoneCollision}
                      updateTrashZoneState={updateTrashZoneState}
                    />
                  )}

                  {activeTool !== "circle" && circles.length > 0 && (
                    <KonvaCircle
                      ref={konvaCircleRef}
                      width={getCurrentCanvasDimensions().width}
                      height={getCurrentCanvasDimensions().height}
                      active={false}
                      color={currentColor}
                      setColor={setCurrentColor}
                      brushSize={brushSize}
                      setBrushSize={setBrushSize}
                      strokeStyle={strokeStyle}
                      setStrokeStyle={setStrokeStyle}
                      circles={circles}
                      backgroundColor={backgroundColor}
                      setBackgroundColor={setBackgroundColor}
                      onAdd={handleKonvaCircleAdd}
                      onMove={handleKonvaCircleMove}
                      setCircles={setCircles} // Use history-aware setter
                      onFlatten={handleKonvaCircleFlatten}
                      onElementSelect={(id, type) => {
                        setSelectedElementId(id);
                        setSelectedElementType(type);
                      }}
                      onElementDeselect={() => {
                        setSelectedElementId(null);
                        setSelectedElementType(null);
                      }}
                      checkTrashZoneCollision={checkTrashZoneCollision}
                      updateTrashZoneState={updateTrashZoneState}
                    />
                  )}

                  {activeTool !== "arrow" && arrows.length > 0 && (
                    <ArrowKonva
                      ref={konvaArrowRef}
                      width={getCurrentCanvasDimensions().width}
                      height={getCurrentCanvasDimensions().height}
                      active={false}
                      color={currentColor}
                      setColor={setCurrentColor}
                      brushSize={brushSize}
                      setBrushSize={setBrushSize}
                      strokeStyle={strokeStyle}
                      setStrokeStyle={setStrokeStyle}
                      onAdd={handleKonvaArrowAdd}
                      onMove={handleKonvaArrowMove}
                      arrows={arrows}
                      setArrows={setArrows} // Use history-aware setter
                      onFlatten={handleKonvaArrowFlatten}
                      onElementSelect={(id, type) => {
                        setSelectedElementId(id);
                        setSelectedElementType(type);
                      }}
                      onElementDeselect={() => {
                        setSelectedElementId(null);
                        setSelectedElementType(null);
                      }}
                      checkTrashZoneCollision={checkTrashZoneCollision}
                      updateTrashZoneState={updateTrashZoneState}
                    />
                  )}

                  {activeTool !== "double-arrow" && doubleArrows.length > 0 && (
                    <KonvaDoubleArrow
                      ref={konvaDoubleArrowRef}
                      width={getCurrentCanvasDimensions().width}
                      height={getCurrentCanvasDimensions().height}
                      active={false}
                      color={currentColor}
                      setColor={setCurrentColor}
                      brushSize={brushSize}
                      setBrushSize={setBrushSize}
                      strokeStyle={strokeStyle}
                      setStrokeStyle={setStrokeStyle}
                      arrows={doubleArrows}
                      onAdd={handleKonvaDoubleArrowAdd}
                      onMove={handleKonvaDoubleArrowMove}
                      setArrows={setDoubleArrows} // Use history-aware setter
                      onFlatten={handleKonvaDoubleArrowFlatten}
                      onElementSelect={(id, type) => {
                        setSelectedElementId(id);
                        setSelectedElementType(type);
                      }}
                      onElementDeselect={() => {
                        setSelectedElementId(null);
                        setSelectedElementType(null);
                      }}
                      checkTrashZoneCollision={checkTrashZoneCollision}
                      updateTrashZoneState={updateTrashZoneState}
                    />
                  )}

                  {activeTool !== "text" && texts.length > 0 && (
                    <TextEditor
                      ref={textEditorRef}
                      width={getCurrentCanvasDimensions().width}
                      height={getCurrentCanvasDimensions().height}
                      active={false}
                      color={currentColor}
                      setColor={setCurrentColor}
                      backgroundColor={backgroundColor}
                      setBackgroundColor={setBackgroundColor}
                      fontSize={fontSize}
                      fontFamily={fontFamily}
                      onAdd={handleKonvaTextAdd}
                      onMove={handleKonvaTextMove}
                      texts={texts}
                      setTexts={setTexts}
                      onFlatten={handleTextFlatten}
                      onElementSelect={(id, type) => {
                        setSelectedElementId(id);
                        setSelectedElementType(type);
                      }}
                      onElementDeselect={() => {
                        setSelectedElementId(null);
                        setSelectedElementType(null);
                      }}
                      checkTrashZoneCollision={checkTrashZoneCollision}
                      updateTrashZoneState={updateTrashZoneState}
                    />
                  )}
                </>
              )}

              {activeTool === "curve" && (
                <CurveTool
                  active={activeTool === "curve"}
                  canvasRef={drawingCanvasRef}
                  currentColor={currentColor}
                  setActiveTool={setActiveTool}
                  strokeStyle={strokeStyle}
                  brushSize={brushSize}
                  createAction={createAction}
                  addAction={addAction}
                  replayManager={replayManager}
                  historyState={historyState}
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
                  createAction={createAction}
                  addAction={addAction}
                  replayManager={replayManager}
                  historyState={historyState}
                />
              )}

              {/* eraser */}
              {eraserCursor && activeTool === "eraser" && (
                <div
                  style={{
                    position: "absolute",
                    left: `${eraserCursor.x - brushSize / 2}px`,
                    top: `${eraserCursor.y - brushSize / 2}px`,
                    width: `${brushSize}px`,
                    height: `${brushSize}px`,
                    border: "2px solid #07070780",
                    borderRadius: "50%",
                    pointerEvents: "none",
                    background: "rgba(255,255,255,0.1)",
                    zIndex: 10,
                    boxSizing: "border-box",
                  }}
                />
              )}

              {/* Trash Icon Overlay - Only visible on mobile when element is selected */}
              {showTrashIcon && (
                <div
                  id="trash-zone"
                  className={`fixed bottom-56 right-6 p-3 rounded-full shadow-lg border-2 transition-all duration-200 text-white ${
                    isDraggedOverTrash
                      ? "bg-red-600 border-red-700 scale-125"
                      : "bg-red-500 border-red-600 hover:bg-red-600 hover:scale-110"
                  }`}
                  style={{
                    background: isDraggedOverTrash
                      ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                      : "linear-gradient(135deg, #ef4444, #dc2626)",
                    boxShadow: isDraggedOverTrash
                      ? "0 6px 20px rgba(239, 68, 68, 0.6)"
                      : "0 4px 15px rgba(239, 68, 68, 0.4)",
                    zIndex: 9999,
                    pointerEvents: "none",
                  }}
                >
                  <Trash2
                    className={`h-6 w-6 transition-transform duration-200 ${
                      isDraggedOverTrash ? "scale-110" : ""
                    }`}
                  />

                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-[8px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                    {isDraggedOverTrash
                      ? "Release to delete"
                      : "Drag here to delete"}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:hidden">
            <MobileView
              undo={undo}
              canUndo={canUndo}
              historyStep={historyState.currentStep}
              history={historyState.actions}
              redo={redo}
              canRedo={canRedo}
              setActiveTool={setActiveTool}
              activeTool={activeTool}
              drawingCanvasRef={drawingCanvasRef}
              handleToolChange={handleToolChange}
              currentColor={currentColor}
              setCurrentColor={setCurrentColor}
              backgroundColor={backgroundColor}
              setBackgroundColor={setBackgroundColor}
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
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="flex items-center text-[12px] w-max"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="flex items-center text-[12px] w-max"
          >
            Save Changes
          </Button>
        </DialogFooter>
        {showCancelConfirm && (
          <Dialog
            open={showCancelConfirm}
            onOpenChange={() => setShowCancelConfirm(false)}
          >
            <DialogContent className="w-[90%] m-auto">
              <DialogHeader>
                <DialogTitle className="mt-3 mr-4 md:mt-0 md:mr-0">
                  Are you sure you want to cancel?
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                You have unsaved changes. Are you sure you want to cancel and
                lose your work?
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCancelConfirm(false)}
                  className="mt-4 md:mt-0"
                >
                  No, keep editing
                </Button>
                <Button variant="destructive" onClick={handleConfirmCancel}>
                  Yes, cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
