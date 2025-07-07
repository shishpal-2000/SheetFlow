import React, { useEffect, useState, useRef, useCallback } from "react";
import { DrawingTool, StrokeStyle } from "./ImageEditorModal";
import { ActionCreators } from "@/utils/actionCreators";
import { DrawingAction, HistoryState } from "@/types/history";
import { CanvasReplayManager } from "@/utils/canvasReplay";

interface Point {
  x: number;
  y: number;
}

interface CurveToolProps {
  active: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  currentColor: string;
  setActiveTool: (tool: DrawingTool | null) => void;
  onFinishCurve?: (curve: Point[]) => void;
  strokeStyle: StrokeStyle;
  brushSize: number;
  createAction?: (
    target: "drawing" | "konva" | "base",
    type: string,
    payload: any
  ) => void;
  addAction?: (action: any) => void;
  replayManager?: React.MutableRefObject<CanvasReplayManager | null>;
  historyState?: HistoryState;
}

const CurveArrowTool: React.FC<CurveToolProps> = ({
  active,
  canvasRef,
  onFinishCurve,
  setActiveTool,
  currentColor,
  strokeStyle,
  brushSize,
  createAction,
  addAction,
  replayManager,
  historyState,
}) => {
  const [curves, setCurves] = useState<Point[][]>([]);
  const [currentCurve, setCurrentCurve] = useState<Point[]>([]);
  const [selectedCurveIndex, setSelectedCurveIndex] = useState<number | null>(
    null
  );
  const [dragging, setDragging] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [drawing, setDrawing] = useState<boolean>(false); // Start as false, only true when actually drawing

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    size: number
  ) => {
    const headLength = Math.max(10, size * 2);
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    // Calculate the actual end point considering the brush size
    const endX = to.x - Math.cos(angle) * (size / 2);
    const endY = to.y - Math.sin(angle) * (size / 2);

    ctx.save();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Draw arrow head
    ctx.beginPath();
    // First line of the arrow head
    ctx.moveTo(
      endX - headLength * Math.cos(angle - Math.PI / 6),
      endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(endX, endY);
    // Second line of the arrow head
    ctx.lineTo(
      endX - headLength * Math.cos(angle + Math.PI / 6),
      endY - headLength * Math.sin(angle + Math.PI / 6)
    );

    // Set the line width for the arrow head (slightly thicker for better visibility)
    ctx.lineWidth = Math.max(1, size * 0.8);
    ctx.stroke();
    ctx.restore();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // When actively drawing, we need to redraw everything to show preview
    // When editing existing curves, we also need to clear and redraw
    const needsFullRedraw =
      (drawing && currentCurve.length > 1) || selectedCurveIndex !== null;

    if (needsFullRedraw) {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Trigger history replay to redraw all previous content
      if (replayManager?.current) {
        // Get all drawing actions from the current history
        const drawingActions = historyState?.actions?.filter(
          (a: any) => a.target === "drawing"
        ) as DrawingAction[];

        // Replay all previous drawing actions
        drawingActions?.forEach((drawingAction) => {
          replayManager.current!.applyDrawingAction(drawingAction);
        });
      }
    }

    // Only draw existing curves if we're editing them
    curves.forEach((curve, idx) => {
      if (curve.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(curve[0].x, curve[0].y);

      for (let i = 0; i < curve.length - 1; i++) {
        const p0 = curve[i - 1] || curve[i];
        const p1 = curve[i];
        const p2 = curve[i + 1];
        const p3 = curve[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }

      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;

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

      ctx.stroke();
      ctx.setLineDash([]);

      // Draw arrows at both ends if there are at least 2 points
      if (curve.length >= 2) {
        drawArrow(
          ctx,
          curve[Math.max(0, curve.length - 2)],
          curve[curve.length - 1],
          brushSize
        );
        drawArrow(ctx, curve[1], curve[0], brushSize);
      }

      // Only show points for selected curves
      if (selectedCurveIndex === idx) {
        curve.forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = currentColor;
          ctx.fill();
        });
      }
    });

    // Draw the current curve being created
    if (drawing && currentCurve.length > 1) {
      const previewCurve = [...currentCurve, ...(mousePos ? [mousePos] : [])];

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(previewCurve[0].x, previewCurve[0].y);

      for (let i = 0; i < previewCurve.length - 1; i++) {
        const p0 = previewCurve[i - 1] || previewCurve[i];
        const p1 = previewCurve[i];
        const p2 = previewCurve[i + 1];
        const p3 = previewCurve[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }

      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;

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

      ctx.stroke();
      ctx.setLineDash([]);

      // Draw arrows at both ends for preview
      if (previewCurve.length >= 2) {
        drawArrow(
          ctx,
          previewCurve[Math.max(0, previewCurve.length - 2)],
          previewCurve[previewCurve.length - 1],
          brushSize
        );
        drawArrow(ctx, previewCurve[1], previewCurve[0], brushSize);
      }

      ctx.restore();
    }

    // Draw preview line to mouse position
    if (drawing && currentCurve.length > 0 && mousePos) {
      const lastPoint = currentCurve[currentCurve.length - 1];
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.strokeStyle = "#070707"; // Preview line color
      ctx.setLineDash([brushSize, brushSize]);
      ctx.lineWidth = brushSize;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const getMousePos = (e: MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    // Calculate position relative to the canvas
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const isNear = (pt1: Point, pt2: Point, distance = 10): boolean => {
    const dx = pt1.x - pt2.x;
    const dy = pt1.y - pt2.y;
    return dx * dx + dy * dy <= distance * distance;
  };

  const handleMouseDown = (e: MouseEvent) => {
    const pos = getMousePos(e);

    if (drawing) {
      setCurrentCurve((prev) => [...prev, pos]);
      return;
    }

    if (selectedCurveIndex !== null) {
      const curve = curves[selectedCurveIndex];
      for (let i = 0; i < curve.length; i++) {
        if (isNear(pos, curve[i])) {
          setDragging(i);
          return;
        }
      }
    }

    const hitIndex = curves.findIndex((curve) =>
      curve.some((pt) => isNear(pt, pos, 8))
    );

    if (hitIndex !== -1) {
      setSelectedCurveIndex(hitIndex);
      return;
    }

    // Start new curve if not hitting any existing curve
    setCurrentCurve([pos]);
    setDrawing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const pos = getMousePos(e);
    setMousePos(pos);

    if (dragging !== null && selectedCurveIndex !== null) {
      setCurves((prev) => {
        const newCurves = [...prev];
        const updatedCurve = [...newCurves[selectedCurveIndex]];
        updatedCurve[dragging] = pos;
        newCurves[selectedCurveIndex] = updatedCurve;
        return newCurves;
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setMousePos(null);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && drawing && currentCurve.length > 1) {
      // Create a DRAW_CURVE_ARROW action using ActionCreators
      if (addAction) {
        const action = ActionCreators.drawDoubleCurve(
          currentCurve,
          currentColor,
          brushSize,
          strokeStyle
        );
        addAction(action);
      }

      // Reset drawing state - don't add to local curves array
      // The history system will handle rendering via replay
      setCurrentCurve([]);
      setMousePos(null);
      setDrawing(false);

      // Don't manually clear the canvas - let the history replay handle it
      // The replay manager will clear and redraw everything properly

      // Delay tool deactivation to allow history replay to complete
      setTimeout(() => {
        setActiveTool(null);
      }, 50); // Increased delay to ensure replay completes

      // Notify parent component if needed
      if (onFinishCurve) {
        onFinishCurve(currentCurve);
      }
    } else if (e.key === "Escape" && drawing) {
      // Cancel current drawing
      setCurrentCurve([]);
      setMousePos(null);
      setDrawing(false);

      // Don't manually clear the canvas - let the history replay handle it
      // This preserves any existing drawings when canceling

      // Delay tool deactivation slightly
      setTimeout(() => {
        setActiveTool(null);
      }, 50);
    }
  };

  useEffect(draw, [
    curves,
    currentCurve,
    selectedCurveIndex,
    dragging,
    drawing,
    mousePos,
  ]);

  // Clean up drawing state when tool becomes inactive
  useEffect(() => {
    if (!active) {
      setDrawing(false);
      setCurrentCurve([]);
      setMousePos(null);
      setSelectedCurveIndex(null);
    }
  }, [active]);

  useEffect(() => {
    if (!active) return; // Add listeners when tool is active, not when drawing

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, currentCurve, curves, dragging, selectedCurveIndex]); // Change dependency from drawing to active

  return null; // purely interactive on canvas, no DOM output
};

export default CurveArrowTool;
