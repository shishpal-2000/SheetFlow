import React, { useEffect, useState, useRef, useCallback } from "react";
import { DrawingTool } from "./ImageEditorModal";

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
  strokeStyle: string;
  brushSize: number;
  createAction?: (
    target: "drawing" | "konva" | "base",
    type: string,
    payload: any
  ) => void;
  addAction?: (action: any) => void;
}

export const CurveTool: React.FC<CurveToolProps> = ({
  active,
  canvasRef,
  onFinishCurve,
  setActiveTool,
  currentColor,
  strokeStyle,
  brushSize,
  createAction,
  addAction,
}) => {
  const [curves, setCurves] = useState<Point[][]>([]);
  const [currentCurve, setCurrentCurve] = useState<Point[]>([]);
  const [selectedCurveIndex, setSelectedCurveIndex] = useState<number | null>(
    null
  );
  const [dragging, setDragging] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [drawing, setDrawing] = useState<boolean>(active);
  const [curveId, setCurveId] = useState<string>("");

  useEffect(() => {
    if (active && !curveId) {
      // Generate unique ID for this curve session
      setCurveId(
        `curve_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      );
    }
  }, [active, curveId]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allCurves = [...curves];
    if (drawing && currentCurve.length > 1) {
      allCurves.push([...currentCurve, ...(mousePos ? [mousePos] : [])]);
    }

    allCurves.forEach((curve, idx) => {
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
      const newCurve = [...currentCurve, pos];
      setCurrentCurve(newCurve);

      if (createAction && addAction) {
        const action = createAction("drawing", "CURVE_ADD_POINT", {
          points: newCurve,
          color: currentColor,
          strokeWidth: brushSize,
          strokeStyle,
          isEraser: false,
          isPartialCurve: true,
          curveId: curveId,
        });
        addAction(action);
      }

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
    const newCurve = [pos];
    setCurrentCurve([pos]);
    setDrawing(true);

    if (createAction && addAction) {
      const action = createAction("drawing", "CURVE_ADD_POINT", {
        points: newCurve,
        color: currentColor,
        strokeWidth: brushSize,
        strokeStyle,
        isEraser: false,
        isPartialCurve: true,
        curveId: curveId,
      });
      addAction(action);
    }
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
      // Clear the canvas first to remove everything
      if (createAction && addAction) {
        const action = createAction("drawing", "DRAW_CURVE", {
          points: currentCurve,
          color: currentColor,
          strokeWidth: brushSize,
          strokeStyle,
          isEraser: false,
          isPartialCurve: false,
          curveId: curveId,
        });
        addAction(action);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }

      // Add the curve to the list and reset state
      setCurves((prev) => [...prev, currentCurve]);
      setCurrentCurve([]);
      setMousePos(null);
      setDrawing(false);
      setActiveTool(null);
      setSelectedCurveIndex(null);

      setCurveId(""); // Reset curve ID for next drawing session

      // Redraw all curves without showing any points
      const allCurves = [...curves, currentCurve];
      if (currentCurve.length > 1) {
        allCurves.push(currentCurve);
      }

      allCurves.forEach((curve, idx) => {
        if (curve.length < 2) return;

        const ctx = canvas?.getContext("2d");
        if (!ctx) return;

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
            ctx.lineWidth = brushSize;
            break;
          case "dotted":
            ctx.setLineDash([brushSize, brushSize]);
            ctx.lineWidth = brushSize;
            break;
          default:
            ctx.setLineDash([]); // solid
            ctx.lineWidth = brushSize;
        }

        ctx.stroke();
        ctx.setLineDash([]);
      });

      if (onFinishCurve) {
        onFinishCurve(currentCurve);
      }
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

  useEffect(() => {
    if (!drawing) return;

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
  }, [drawing, currentCurve, curves, dragging, selectedCurveIndex]);

  return null; // purely interactive on canvas, no DOM output
};
