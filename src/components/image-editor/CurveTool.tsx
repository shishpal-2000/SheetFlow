import React, { useEffect, useState, useRef } from "react";

interface Point {
  x: number;
  y: number;
}

interface CurveToolProps {
  active: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onFinishCurve?: (curve: Point[]) => void;
}

export const CurveTool: React.FC<CurveToolProps> = ({
  active,
  canvasRef,
  onFinishCurve,
}) => {
  const [curves, setCurves] = useState<Point[][]>([]);
  const [currentCurve, setCurrentCurve] = useState<Point[]>([]);
  const [selectedCurveIndex, setSelectedCurveIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allCurves = [...curves];
    if (active && currentCurve.length > 1) {
      allCurves.push(currentCurve);
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

      ctx.strokeStyle = "#007acc";
      ctx.lineWidth = 2;
      ctx.stroke();

      const shouldShowPoints = (active && idx === allCurves.length - 1) || idx === selectedCurveIndex;
      if (shouldShowPoints) {
        curve.forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "#007acc";
          ctx.fill();
        });
      }
    });

    if (active && currentCurve.length > 0 && mousePos) {
      const lastPoint = currentCurve[currentCurve.length - 1];
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.strokeStyle = "#aaa";
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const getMousePos = (e: MouseEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
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
    if (active) {
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
    } else {
      setSelectedCurveIndex(null);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    const pos = getMousePos(e);
    if (active && currentCurve.length > 0) {
      setMousePos(pos);
      return;
    }

    if (dragging !== null && selectedCurveIndex !== null) {
      setCurves((prev) => {
        const newCurves = [...prev];
        newCurves[selectedCurveIndex][dragging] = pos;
        return newCurves;
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setMousePos(null);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && active && currentCurve.length > 1) {
      setCurves((prev) => [...prev, currentCurve]);
      setSelectedCurveIndex(curves.length);
      setCurrentCurve([]);
      setMousePos(null);
      if (onFinishCurve) onFinishCurve(currentCurve);
    }
  };

  useEffect(draw, [curves, currentCurve, selectedCurveIndex, dragging, active, mousePos]);

  useEffect(() => {
    if (!active) return;

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
  }, [active, currentCurve, curves, dragging, selectedCurveIndex]);

  return null; // purely interactive on canvas, no DOM output
};
