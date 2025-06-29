"use client";
import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Stage, Layer, Rect, Transformer } from "react-konva";

export interface KonvaRectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  draggable: boolean;
  rotation: number;
  fill?: string; // Optional fill color for the rectangle
}

interface KonvaRectangleProps {
  width: number;
  height: number;
  active: boolean;
  color: string;
  brushSize: number;
  backgroundColor?: string;
  rectangles: any[];
  setRectangles: React.Dispatch<React.SetStateAction<any[]>>;
  onFlatten: (rects: any[]) => void;
  onElementSelect?: (elementId: string, elementType: string) => void;
  onElementDeselect?: () => void;
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
      brushSize,
      backgroundColor,
      onFlatten,
      onElementSelect,
      onElementDeselect,
    },
    ref
  ) => {
    const [rectangles, setRectangles] = useState<KonvaRectangle[]>([]);
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

    // Keyboard delete
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
          setRectangles((rects) => rects.filter((r) => r.id !== selectedId));
          setSelectedId(null);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedId]);

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
                  // Only update fill if backgroundColor is provided, otherwise keep existing fill
                  ...(backgroundColor !== undefined && {
                    fill: backgroundColor,
                  }),
                }
              : r
          )
        );
      }
    }, [color, backgroundColor, selectedId]);

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

      setRectangles((rects) => [...rects, newRect]);
      setNewRect(null);
    };

    const handleRectClick = (id: string) => {
      setSelectedId(id);
      // Notify parent about selection
      if (onElementSelect) {
        onElementSelect(id, "rectangle");
      }
    };

    const handleDragEnd = (e: any, id: string) => {
      const stage = e.target.getStage();
      const node = e.target;
      const { x, y } = node.position();

      // Get the stage's position on screen
      const stageContainer = stage.container();
      const stageRect = stageContainer.getBoundingClientRect();

      // Convert stage coordinates to screen coordinates
      const screenX = stageRect.left + x;
      const screenY = stageRect.top + y;

      // Check if dropped on trash zone
      const trashZone = document.getElementById("trash-zone");
      if (trashZone) {
        const trashRect = trashZone.getBoundingClientRect();

        // Check if the rectangle overlaps with trash zone (with some tolerance)
        const tolerance = 50;
        if (
          screenX + 50 >= trashRect.left - tolerance && // rectangle right edge
          screenX - 50 <= trashRect.right + tolerance && // rectangle left edge
          screenY + 50 >= trashRect.top - tolerance && // rectangle bottom edge
          screenY - 50 <= trashRect.bottom + tolerance // rectangle top edge
        ) {
          // Delete the rectangle
          setRectangles((rects) => rects.filter((r) => r.id !== id));
          setSelectedId(null);
          if (onElementDeselect) onElementDeselect();
          return;
        }
      }

      // Normal drag behavior - update position
      setRectangles((rects) =>
        rects.map((r) => (r.id === id ? { ...r, x, y } : r))
      );
    };

    const handleTransformEnd = (e: any, id: string) => {
      const node = e.target;

      // Extract transformations
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const rotation = node.rotation();

      // Normalize dimensions
      const newWidth = Math.max(5, node.width() * scaleX); // Minimum width of 5
      const newHeight = Math.max(5, node.height() * scaleY); // Minimum height of 5

      // Reset Konva node transformations
      node.scaleX(1);
      node.scaleY(1);

      // Update state with new properties
      setRectangles((rects) =>
        rects.map((r) =>
          r.id === id
            ? {
                ...r,
                x: node.x(),
                y: node.y(),
                width: newWidth,
                height: newHeight,
                rotation: rotation,
              }
            : r
        )
      );
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
              draggable={rect.draggable}
              rotation={rect.rotation}
              fill={rect.fill}
              onClick={() => handleRectClick(rect.id)}
              onTap={() => handleRectClick(rect.id)}
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
              dash={[4, 4]}
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
