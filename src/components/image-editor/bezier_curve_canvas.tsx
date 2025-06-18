import React, { useRef, useState, useEffect } from "react";

interface Point {
  x: number;
  y: number;
}

export default function SplineCurveEditor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [curves, setCurves] = useState<Point[][]>([]);
  const [currentCurve, setCurrentCurve] = useState<Point[]>([]);
  const [selectedCurveIndex, setSelectedCurveIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [drawing, setDrawing] = useState<boolean>(false);
  const [mousePos, setMousePos] = useState<Point | null>(null);

  useEffect(() => {
    draw();
  }, [curves, currentCurve, selectedCurveIndex, dragging, drawing, mousePos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawing && currentCurve.length > 1) {
        setCurves((prev) => [...prev, currentCurve]);
        setSelectedCurveIndex(curves.length);
        setCurrentCurve([]);
        setDrawing(false);
        setMousePos(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawing, currentCurve, curves.length]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
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

      const shouldShowPoints = (drawing && idx === allCurves.length - 1) || idx === selectedCurveIndex;
      if (shouldShowPoints) {
        curve.forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "#007acc";
          ctx.fill();
        });
      }
    });

    if (drawing && currentCurve.length > 0 && mousePos) {
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

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
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

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
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

  const handleMouseUp = () => {
    setDragging(null);
    setMousePos(null);
  };

  const toggleDrawing = () => {
    if (drawing && currentCurve.length > 1) {
      setCurves((prev) => [...prev, currentCurve]);
      setSelectedCurveIndex(curves.length);
    }
    setCurrentCurve([]);
    setDragging(null);
    setMousePos(null);
    setDrawing((prev) => !prev);
  };

  const resetAll = () => {
    setCurves([]);
    setCurrentCurve([]);
    setSelectedCurveIndex(null);
    setDragging(null);
    setDrawing(false);
    setMousePos(null);
  };

  return (
    <div className="flex flex-col items-center mt-6">
      <h2 className="text-xl mb-2">Excel-Like Smooth Curve Editor</h2>
      <div className="mb-2 space-x-2">
        <button
          onClick={toggleDrawing}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {drawing ? "Finish Curve" : "New Curve"}
        </button>
        <button
          onClick={resetAll}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Reset All
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={500}
        height={400}
        className="border border-gray-400"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
}
