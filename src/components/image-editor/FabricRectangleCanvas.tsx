"use client";
import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Rect, Canvas, TEvent } from "fabric";

interface FabricRectangleCanvasProps {
  width: number;
  height: number;
  active: boolean;
  color: string;
  brushSize: number;
  onFlatten: (rects: Rect[]) => void;
}

export interface FabricRectangleCanvasHandle {
  flatten: () => void;
}

const FabricRectangleCanvas = forwardRef<
  FabricRectangleCanvasHandle,
  FabricRectangleCanvasProps
>(({ width, height, active, color, brushSize, onFlatten }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricInstanceRef = useRef<Canvas | null>(null);

  useImperativeHandle(ref, () => ({
    flatten: () => {
      if (!fabricInstanceRef.current) return;
      const rects = fabricInstanceRef.current.getObjects("rect") as Rect[];
      onFlatten(rects);
      rects.forEach((r) => fabricInstanceRef.current?.remove(r));
      fabricInstanceRef.current.discardActiveObject();
      fabricInstanceRef.current.requestRenderAll();
    },
  }));

  useEffect(() => {
    if (!canvasRef.current) return;
    // Dispose previous instance if exists
    if (fabricInstanceRef.current) {
      try {
        fabricInstanceRef.current.dispose();
      } catch (e) {
        // Ignore error if node is already removed
      }
      fabricInstanceRef.current = null;
    }

    const fabricCanvas = new Canvas(canvasRef.current, {
      backgroundColor: "rgba(0,0,0,0)",
      selection: true,
      width,
      height,
    });
    fabricInstanceRef.current = fabricCanvas;

    // Keyboard delete handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeObj = fabricCanvas.getActiveObject();
        if (activeObj) {
          fabricCanvas.remove(activeObj);
          fabricCanvas.discardActiveObject();
          fabricCanvas.requestRenderAll();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    let isDrawing = false;
    let startX = 0,
      startY = 0;
    let rect: Rect | null = null;

    function hasRectangle() {
      return fabricCanvas.getObjects("rect").length > 0;
    }

    function mouseDown(opt: TEvent) {
      if (!active) return;

      const pointerTarget = fabricCanvas.findTarget(opt.e);
      if (pointerTarget) return;
      isDrawing = true;
      const pointer = fabricCanvas.getPointer(opt.e);
      startX = pointer.x;
      startY = pointer.y;
      rect = new Rect({
        left: startX,
        top: startY,
        width: 0,
        height: 0,
        fill: "rgba(0,0,0,0)",
        stroke: color,
        strokeWidth: brushSize,
        selectable: true,
        hasControls: true,
      });
      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
    }
    function mouseMove(opt: TEvent) {
      if (!isDrawing || !rect || !active) return;
      const pointer = fabricCanvas.getPointer(opt.e);
      rect.set({
        width: Math.abs(pointer.x - startX),
        height: Math.abs(pointer.y - startY),
        left: Math.min(pointer.x, startX),
        top: Math.min(pointer.y, startY),
      });
      fabricCanvas.renderAll();
    }
    function mouseUp() {
      if (!active) return;
      isDrawing = false;
      rect = null;
    }
    fabricCanvas.on("mouse:down", mouseDown);
    fabricCanvas.on("mouse:move", mouseMove);
    fabricCanvas.on("mouse:up", mouseUp);

    return () => {
      fabricCanvas.off("mouse:down", mouseDown);
      fabricCanvas.off("mouse:move", mouseMove);
      fabricCanvas.off("mouse:up", mouseUp);
      document.removeEventListener("keydown", handleKeyDown);
      try {
        fabricCanvas.dispose();
      } catch (e) {
        // Ignore error if node is already removed
      }
      fabricInstanceRef.current = null;
    };
  }, [active, color, brushSize, width, height]);

  useEffect(() => {
    if (!fabricInstanceRef.current) return;
    const fabricCanvas = fabricInstanceRef.current;
    if (active) {
      fabricCanvas.upperCanvasEl.style.pointerEvents = "auto";
      fabricCanvas.upperCanvasEl.style.display = "block";
    } else {
      fabricCanvas.upperCanvasEl.style.pointerEvents = "none";
      fabricCanvas.upperCanvasEl.style.display = "none";
    }
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 30,
        pointerEvents: active ? "auto" : "none",
      }}
    />
  );
});

export default FabricRectangleCanvas;
