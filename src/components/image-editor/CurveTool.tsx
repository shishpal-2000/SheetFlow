import { useEffect, useState, useRef } from "react";

export interface Point {
  x: number;
  y: number;
}

interface CurveToolProps {
  active: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const CurveTool = ({ active, canvasRef }: CurveToolProps) => {
  const [curves, setCurves] = useState<Point[][]>([]);
  const [currentCurve, setCurrentCurve] = useState<Point[]>([]);
  const [selectedCurveIndex, setSelectedCurveIndex] = useState<number | null>(
    null
  );
  const [dragging, setDragging] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);

  const drawing = active && currentCurve.length > 0;

  const getMousePos = (e: MouseEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const isNear = (pt1: Point, pt2: Point, dist = 10) =>
    (pt1.x - pt2.x) ** 2 + (pt1.y - pt2.y) ** 2 <= dist ** 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allCurves = [...curves];
    if (drawing && currentCurve.length > 1) {
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

      const showPoints =
        (drawing && idx === allCurves.length - 1) || idx === selectedCurveIndex;
      if (showPoints) {
        curve.forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "#007acc";
          ctx.fill();
        });
      }
    });

    if (drawing && currentCurve.length > 0 && mousePos) {
      const last = currentCurve[currentCurve.length - 1];
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "#999";
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [curves, currentCurve, selectedCurveIndex, mousePos, drawing]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && currentCurve.length > 1) {
        setCurves((prev) => [...prev, currentCurve]);
        setSelectedCurveIndex(curves.length);
        setCurrentCurve([]);
        setMousePos(null);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentCurve, curves.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    const handleDown = (e: MouseEvent) => {
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
      } else {
        setSelectedCurveIndex(null);
      }
    };

    const handleMove = (e: MouseEvent) => {
      const pos = getMousePos(e);
      if (drawing) {
        setMousePos(pos);
        return;
      }

      if (dragging === null || selectedCurveIndex === null) return;
      setCurves((prev) => {
        const newCurves = [...prev];
        newCurves[selectedCurveIndex][dragging] = pos;
        return newCurves;
      });
    };

    const handleUp = () => {
      setDragging(null);
      setMousePos(null);
    };

    canvas.addEventListener("mousedown", handleDown);
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseup", handleUp);

    return () => {
      canvas.removeEventListener("mousedown", handleDown);
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseup", handleUp);
    };
  }, [active, drawing, dragging, selectedCurveIndex, currentCurve]);

  return null; // logic only; drawing happens directly on canvas
};
