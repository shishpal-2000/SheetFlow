"use client";
import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Stage, Layer, Rect, Transformer } from "react-konva";
import { StrokeStyle } from "./ImageEditorModal";
import { getDashPattern } from "@/utils/getStrokePattern";
import { KONVA_THRESHOLDS } from "@/utils/konvaThreshold";

export interface KonvaRectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  draggable: boolean;
  dash?: number[]; // Optional dash pattern for stroke
  rotation: number;
  fill?: string; // Optional fill color for the rectangle
}

interface KonvaRectangleProps {
  width: number;
  height: number;
  active: boolean;
  color: string;
  setColor: (color: string) => void;
  brushSize: number;
  strokeStyle: StrokeStyle;
  backgroundColor?: string;
  setBackgroundColor: (color: string) => void;
  onAdd?: (rect: KonvaRectangle) => void;
  onMove?: (id: string, newData: any, previousData: any) => void; // Add this for history tracking
  rectangles: any[];
  setRectangles: React.Dispatch<React.SetStateAction<any[]>>;
  onFlatten: (rects: any[]) => void;
  onElementSelect?: (elementId: string, elementType: string) => void;
  onElementDeselect?: () => void;
  checkTrashZoneCollision?: (screenX: number, screenY: number) => boolean;
  updateTrashZoneState?: (isOver: boolean) => void;
}

export interface KonvaRectangleHandle {
  flatten: () => void;
}

const KonvaRectangle = forwardRef<KonvaRectangleHandle, KonvaRectangleProps>(
  (
    {
      width,
      height,
      active,
      color,
      setColor,
      brushSize,
      strokeStyle,
      backgroundColor,
      setBackgroundColor,
      onAdd,
      rectangles,
      setRectangles,
      onFlatten,
      onElementSelect,
      onElementDeselect,
      checkTrashZoneCollision,
      updateTrashZoneState,
      onMove, // Destructure onMove prop
    },
    ref
  ) => {
    // const [rectangles, setRectangles] = useState<KonvaRectangle[]>([]);
    const [newRect, setNewRect] = useState<KonvaRectangle | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const stageRef = useRef<any>(null);
    const trRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      flatten: () => {
        onFlatten(rectangles);
        setRectangles([]);
        setSelectedId(null);
      },
    }));

    useEffect(() => {
      if (stageRef.current) {
        const stage = stageRef.current;
        stage.width(width);
        stage.height(height);
        stage.batchDraw();
      }
    }, [width, height]);

    // Keyboard delete
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
          setRectangles((rects) => rects.filter((r) => r.id !== selectedId));
          setSelectedId(null);

          if (trRef.current) {
            trRef.current.nodes([]);
            trRef.current.getLayer().batchDraw();
          }

          if (onElementDeselect) {
            onElementDeselect();
          }
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedId, setRectangles, onElementDeselect]);

    // Transformer selection
    useEffect(() => {
      if (trRef.current && selectedId) {
        const node = stageRef.current.findOne(`#${selectedId}`);
        if (node) {
          trRef.current.nodes([node]);
          trRef.current.getLayer().batchDraw();
        }
      } else if (trRef.current) {
        trRef.current.nodes([]);
        trRef.current.getLayer().batchDraw();
      }
    }, [selectedId, rectangles]);

    // Update selected rectangle's color/backgroundColor when props change
    useEffect(() => {
      if (selectedId) {
        setRectangles((rects) =>
          rects.map((r) =>
            r.id === selectedId
              ? {
                  ...r,
                  stroke: color,
                  strokeWidth: brushSize,
                  dash: getDashPattern(strokeStyle, brushSize),
                  ...(backgroundColor !== undefined && {
                    fill: backgroundColor,
                  }),
                }
              : r
          )
        );
      }
    }, [color, backgroundColor, selectedId, strokeStyle, brushSize]);

    // Drawing logic
    const handleMouseDown = (e: any) => {
      if (!active) return;

      // Prevent default behavior for touch events
      if (e.evt) {
        e.evt.preventDefault();
      }

      // Only draw if not clicking on an existing rect
      const clickedOnEmpty = e.target === e.target.getStage();
      if (!clickedOnEmpty) return;

      // Get pointer position (works for both mouse and touch)
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;

      const id = `rect-${Date.now()}`;
      setNewRect({
        id,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        stroke: color,
        strokeWidth: brushSize,
        draggable: true,
        rotation: 0,
        dash: getDashPattern(strokeStyle, brushSize),
        fill: backgroundColor || undefined,
      });
      setSelectedId(id);
    };

    const handleMouseMove = (e: any) => {
      if (!active || !newRect) return;

      // Prevent default behavior for touch events
      if (e.evt) {
        e.evt.preventDefault();
      }

      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;

      setNewRect({
        ...newRect,
        width: Math.abs(pos.x - newRect.x),
        height: Math.abs(pos.y - newRect.y),
        x: Math.min(pos.x, newRect.x),
        y: Math.min(pos.y, newRect.y),
      });
    };

    const handleMouseUp = (e: any) => {
      if (!active || !newRect) return;

      // Prevent default behavior for touch events
      if (e.evt) {
        e.evt.preventDefault();
      }

      if (
        newRect.width >= KONVA_THRESHOLDS.MIN_RECT_WIDTH &&
        newRect.height >= KONVA_THRESHOLDS.MIN_RECT_HEIGHT
      ) {
        setRectangles((rects) => [...rects, newRect]);
        if (onAdd) {
          onAdd(newRect);
        }
      }
      setNewRect(null);
    };

    const handleRectClick = (id: string) => {
      setSelectedId(id);
      setColor(rectangles.find((r) => r.id === id)?.stroke || "#000000");
      setBackgroundColor(
        rectangles.find((r) => r.id === id)?.fill || "transparent"
      );
      if (onElementSelect) {
        onElementSelect(id, "rectangle");
      }
    };

    const handleDragMove = (e: any, id: string) => {
      const stage = e.target.getStage();
      const node = e.target;
      const { x, y } = node.position();

      // Get screen coordinates for trash detection
      const stageContainer = stage.container();
      const stageRect = stageContainer.getBoundingClientRect();
      const screenX = stageRect.left + x;
      const screenY = stageRect.top + y;

      // Check collision with trash zone
      if (checkTrashZoneCollision && updateTrashZoneState) {
        const isOverTrash = checkTrashZoneCollision(screenX, screenY);
        updateTrashZoneState(isOverTrash);
      }
    };

    const handleDragEnd = (e: any, id: string) => {
      const stage = e.target.getStage();
      const node = e.target;
      const { x, y } = node.position();

      // Get the previous rectangle data before moving
      const previousRect = rectangles.find((r) => r.id === id);

      // Reset trash zone state
      if (updateTrashZoneState) {
        updateTrashZoneState(false);
      }

      // Get screen coordinates
      const stageContainer = stage.container();
      const stageRect = stageContainer.getBoundingClientRect();
      const screenX = stageRect.left + x;
      const screenY = stageRect.top + y;

      // Check if dropped on trash zone
      if (
        checkTrashZoneCollision &&
        checkTrashZoneCollision(screenX, screenY)
      ) {
        // Delete the rectangle
        setRectangles((rects) => rects.filter((r) => r.id !== id));
        setSelectedId(null);

        if (trRef.current) {
          trRef.current.nodes([]);
          trRef.current.getLayer().batchDraw();
        }

        if (onElementDeselect) onElementDeselect();
        return;
      }

      // Normal drag behavior - update position
      const newRect = { ...previousRect, x, y };
      setRectangles((rects) => rects.map((r) => (r.id === id ? newRect : r)));

      // Call onMove prop for history tracking if position actually changed
      if (
        onMove &&
        previousRect &&
        (previousRect.x !== x || previousRect.y !== y)
      ) {
        onMove(id, newRect, previousRect);
      }
    };

    const handleTransformEnd = (e: any, id: string) => {
      const node = e.target;

      // Get the previous rectangle data before transforming
      const previousRect = rectangles.find((r) => r.id === id);

      // Extract transformations
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const rotation = node.rotation();

      // Normalize dimensions
      const newWidth = Math.max(
        KONVA_THRESHOLDS.MIN_RECT_HEIGHT,
        node.width() * scaleX
      ); // Minimum width of 10
      const newHeight = Math.max(
        KONVA_THRESHOLDS.MIN_RECT_HEIGHT,
        node.height() * scaleY
      ); // Minimum height of 10

      // Reset Konva node transformations
      node.scaleX(1);
      node.scaleY(1);

      // Create the new rectangle data
      const newRect = {
        ...previousRect,
        x: node.x(),
        y: node.y(),
        width: newWidth,
        height: newHeight,
        rotation: rotation,
      };

      // Update state with new properties
      setRectangles((rects) => rects.map((r) => (r.id === id ? newRect : r)));

      // Call onMove prop for history tracking if size or rotation changed
      if (onMove && previousRect) {
        const hasChanged =
          previousRect.width !== newWidth ||
          previousRect.height !== newHeight ||
          previousRect.rotation !== rotation ||
          previousRect.x !== node.x() ||
          previousRect.y !== node.y();

        if (hasChanged) {
          onMove(id, newRect, previousRect);
        }
      }
    };

    return (
      <Stage
        width={width}
        height={height}
        ref={stageRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 30,
          pointerEvents: active ? "auto" : "none",
        }}
        // Mouse Event (Desktop)
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        // Touch Event (Mobile)
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        onClick={(e) => {
          const clickedOnEmpty = e.target === e.target.getStage();
          if (clickedOnEmpty) {
            setSelectedId(null);
            if (onElementDeselect) {
              onElementDeselect();
            }
          }
        }}
        onTap={(e) => {
          const clickedOnEmpty = e.target === e.target.getStage();
          if (clickedOnEmpty) {
            setSelectedId(null);
            if (onElementDeselect) {
              onElementDeselect();
            }
          }
        }}
      >
        <Layer>
          {rectangles.map((rect) => (
            <Rect
              key={rect.id}
              id={rect.id}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              stroke={rect.stroke}
              strokeWidth={rect.strokeWidth}
              dash={rect.dash}
              draggable={rect.draggable}
              rotation={rect.rotation}
              fill={rect.fill}
              onClick={() => handleRectClick(rect.id)}
              onTap={() => handleRectClick(rect.id)}
              onDragMove={(e) => handleDragMove(e, rect.id)}
              onDragEnd={(e) => handleDragEnd(e, rect.id)}
              onTransformEnd={(e) => handleTransformEnd(e, rect.id)}
            />
          ))}
          {newRect && (
            <Rect
              x={newRect.x}
              y={newRect.y}
              width={newRect.width}
              height={newRect.height}
              stroke={newRect.stroke}
              strokeWidth={newRect.strokeWidth}
              dash={newRect.dash}
              fill={newRect.fill}
            />
          )}
          <Transformer
            ref={trRef}
            rotateEnabled={false}
            enabledAnchors={[
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
              "middle-left",
              "middle-right",
              "top-center",
              "bottom-center",
            ]}
            anchorSize={8}
            borderDash={[4, 4]}
          />
        </Layer>
      </Stage>
    );
  }
);

export default KonvaRectangle;
