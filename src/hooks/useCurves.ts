import { Point } from "@/components/image-editor/ImageEditorModal";
import { useState } from "react";

// useCurves.ts
export function useCurves(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const [curves, setCurves] = useState<Point[][]>([]);
  const [currentCurve, setCurrentCurve] = useState<Point[]>([]);
  const [selectedCurveIndex, setSelectedCurveIndex] = useState<number | null>(
    null
  );
  const [dragging, setDragging] = useState<number | null>(null);
  const [drawing, setDrawing] = useState<boolean>(false);
  const [mousePos, setMousePos] = useState<Point | null>(null);

  const resetAll = () => {
    setCurves([]);
    setCurrentCurve([]);
    setSelectedCurveIndex(null);
    setDragging(null);
    setDrawing(false);
    setMousePos(null);
  };

  // Expose all relevant state and actions
  return {
    curves,
    currentCurve,
    selectedCurveIndex,
    dragging,
    drawing,
    mousePos,
    setCurves,
    setCurrentCurve,
    setSelectedCurveIndex,
    setDragging,
    setDrawing,
    setMousePos,
    resetAll,
  };
}
