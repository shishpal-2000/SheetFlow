"use client";
import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Stage, Layer, Arrow, Transformer } from "react-konva";
import { StrokeStyle } from "./ImageEditorModal";

export interface KonvaArrow {
  id: string;
  points: number[]; // [x1, y1, x2, y2]
  stroke: string;
  strokeWidth: number;
  draggable: boolean;
}

interface KonvaArrowProps {
  width: number;
  height: number;
  active: boolean;
  color: string;
  brushSize: number;
  strokeStyle: StrokeStyle;
  arrows: KonvaArrow[];
  setArrows: React.Dispatch<React.SetStateAction<KonvaArrow[]>>;
  onFlatten: (arrows: KonvaArrow[]) => void;
  onElementSelect?: (elementId: string, elementType: string) => void;
  onElementDeselect?: () => void;
}

export interface KonvaArrowHandle {
  flatten: () => void;
}

const ArrowKonva = forwardRef<KonvaArrowHandle, KonvaArrowProps>(
  (
    {
      width,
      height,
      active,
      color,
      brushSize,
      strokeStyle,
      arrows,
      setArrows,
      onFlatten,
      onElementSelect,
      onElementDeselect,
    },
    ref
  ) => {
    const [newArrow, setNewArrow] = useState<KonvaArrow | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const stageRef = useRef<any>(null);
    const trRef = useRef<any>(null);

    // Add states for touch gestures
    const [lastDist, setLastDist] = useState<number>(0);
    const [lastRotation, setLastRotation] = useState<number>(0);

    useImperativeHandle(ref, () => ({
      flatten: () => {
        onFlatten(arrows);
        setArrows([]);
        setSelectedId(null);
      },
    }));

    // Helper functions for touch gestures
    const getDistance = (p1: any, p2: any) => {
      return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    };

    const getAngle = (p1: any, p2: any) => {
      return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    };

    const getCenter = (p1: any, p2: any) => {
      return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };
    };

    const getDashPattern = (style: StrokeStyle) => {
      switch (style) {
        case "solid":
          return [];
        case "dashed":
          return [brushSize * 3, brushSize * 2];
        case "dotted":
          return [brushSize, brushSize];
        case "double":
          return []; // For double style, we'll handle differently
        default:
          return [];
      }
    };

    // Keyboard delete
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
          setArrows((arrs) => arrs.filter((a) => a.id !== selectedId));
          setSelectedId(null);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedId, setArrows]);

    // Transformer selection
    useEffect(() => {
      if (trRef.current && selectedId && stageRef.current) {
        const node = stageRef.current.findOne(`#${selectedId}`);
        if (node) {
          trRef.current.nodes([node]);
          trRef.current.getLayer().batchDraw();
        }
      } else if (trRef.current) {
        trRef.current.nodes([]);
        trRef.current.getLayer().batchDraw();
      }
    }, [selectedId, arrows]);

    // Single click to start drawing
    const handleStageClick = (e: any) => {
      if (!active) return;

      // Prevent default behavior for touch events
      if (e.evt) {
        e.evt.preventDefault();
      }

      // Only start drawing if it's a single touch
      if (e.evt.touches && e.evt.touches.length > 1) return;

      const clickedOnEmpty = e.target === e.target.getStage();
      if (!clickedOnEmpty) return;

      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;

      const id = `arrow-${Date.now()}`;
      setNewArrow({
        id,
        points: [pos.x, pos.y, pos.x, pos.y],
        stroke: color,
        strokeWidth: brushSize,
        draggable: true,
      });
      setSelectedId(id);
    };

    const handleMouseMove = (e: any) => {
      if (!active || !newArrow) return;

      // Prevent default behavior for touch events
      if (e.evt) {
        e.evt.preventDefault();
      }

      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;

      setNewArrow({
        ...newArrow,
        points: [newArrow.points[0], newArrow.points[1], pos.x, pos.y],
      });
    };

    const handleMouseUp = (e: any) => {
      if (!active || !newArrow) return;

      // Prevent default behavior for touch events
      if (e.evt) {
        e.evt.preventDefault();
      }

      setArrows((arrs) => [...arrs, newArrow]);
      setNewArrow(null);
    };

    // Add touch move handler for gestures
    const handleTouchMove = (e: any) => {
      if (!active) return;

      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      // If we're drawing a new arrow, handle that first
      if (newArrow && !touch2) {
        handleMouseMove(e);
        return;
      }

      // Two-finger gestures for selected arrow
      if (touch1 && touch2 && selectedId) {
        e.evt.preventDefault();

        const dist = getDistance(
          { x: touch1.clientX, y: touch1.clientY },
          { x: touch2.clientX, y: touch2.clientY }
        );

        const angle = getAngle(
          { x: touch1.clientX, y: touch1.clientY },
          { x: touch2.clientX, y: touch2.clientY }
        );

        const center = getCenter(
          { x: touch1.clientX, y: touch1.clientY },
          { x: touch2.clientX, y: touch2.clientY }
        );

        // Get stage position for proper coordinate conversion
        const stage = stageRef.current;
        const stageBox = stage.container().getBoundingClientRect();
        const stageCenter = {
          x: center.x - stageBox.left,
          y: center.y - stageBox.top,
        };

        if (lastDist > 0 && lastRotation !== null) {
          const scale = dist / lastDist;
          const rotationDelta = angle - lastRotation;

          setArrows((arrs) =>
            arrs.map((a) => {
              if (a.id === selectedId) {
                const [x1, y1, x2, y2] = a.points;
                const arrowCenter = {
                  x: (x1 + x2) / 2,
                  y: (y1 + y2) / 2,
                };

                // Calculate new points with scaling
                const length = Math.sqrt(
                  Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)
                );
                const currentAngle = Math.atan2(y2 - y1, x2 - x1);
                const newLength = length * scale;
                const newAngle = currentAngle + rotationDelta;

                const newX1 =
                  arrowCenter.x - (newLength / 2) * Math.cos(newAngle);
                const newY1 =
                  arrowCenter.y - (newLength / 2) * Math.sin(newAngle);
                const newX2 =
                  arrowCenter.x + (newLength / 2) * Math.cos(newAngle);
                const newY2 =
                  arrowCenter.y + (newLength / 2) * Math.sin(newAngle);

                return {
                  ...a,
                  points: [newX1, newY1, newX2, newY2],
                };
              }
              return a;
            })
          );
        }

        setLastDist(dist);
        setLastRotation(angle);
      }
    };

    const handleTouchEnd = (e: any) => {
      // Reset gesture tracking
      setLastDist(0);
      setLastRotation(0);

      // Handle arrow creation end
      if (newArrow && !e.evt.touches.length) {
        handleMouseUp(e);
      }
    };

    const handleArrowClick = (id: string) => {
      setSelectedId(id);
      if (onElementSelect) {
        onElementSelect(id, "arrow");
      }
    };

    const handleTransformEnd = (e: any, id: string) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const x = node.x();
      const y = node.y();
      const oldPoints = node.points();

      // Scale points around the center
      const cx = (oldPoints[0] + oldPoints[2]) / 2;
      const cy = (oldPoints[1] + oldPoints[3]) / 2;
      const newPoints = [
        cx + (oldPoints[0] - cx) * scaleX + x,
        cy + (oldPoints[1] - cy) * scaleY + y,
        cx + (oldPoints[2] - cx) * scaleX + x,
        cy + (oldPoints[3] - cy) * scaleY + y,
      ];

      node.scaleX(1);
      node.scaleY(1);
      node.x(0);
      node.y(0);

      setArrows((arrs) =>
        arrs.map((a) =>
          a.id === id
            ? {
                ...a,
                points: newPoints,
              }
            : a
        )
      );
    };

    const handleDragEnd = (e: any, id: string) => {
      const node = e.target;
      const stage = e.target.getStage();
      const x = node.x();
      const y = node.y();

      // Get the stage's position on screen
      const stageContainer = stage.container();
      const stageRect = stageContainer.getBoundingClientRect();

      // Get arrow center point for trash detection
      const oldPoints = node.points();
      const centerX = (oldPoints[0] + oldPoints[2]) / 2;
      const centerY = (oldPoints[1] + oldPoints[3]) / 2;

      // Convert stage coordinates to screen coordinates
      const screenX = stageRect.left + centerX + x;
      const screenY = stageRect.top + centerY + y;

      // Check if dropped on trash zone
      const trashZone = document.getElementById("trash-zone");
      if (trashZone) {
        const trashRect = trashZone.getBoundingClientRect();

        // Check if the arrow center overlaps with trash zone (with tolerance)
        const tolerance = 50;
        if (
          screenX >= trashRect.left - tolerance &&
          screenX <= trashRect.right + tolerance &&
          screenY >= trashRect.top - tolerance &&
          screenY <= trashRect.bottom + tolerance
        ) {
          // Delete the arrow
          setArrows((arrs) => arrs.filter((a) => a.id !== id));
          setSelectedId(null);
          if (onElementDeselect) onElementDeselect();
          return;
        }
      }

      // Normal drag behavior - update arrow position
      const dx = x;
      const dy = y;
      const newPoints = [
        oldPoints[0] + dx,
        oldPoints[1] + dy,
        oldPoints[2] + dx,
        oldPoints[3] + dy,
      ];

      node.x(0);
      node.y(0);

      setArrows((arrs) =>
        arrs.map((a) =>
          a.id === id
            ? {
                ...a,
                points: newPoints,
              }
            : a
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
        // Mouse events (Desktop)
        onMouseDown={handleStageClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        // Touch events (Mobile)
        onTouchStart={handleStageClick}
        onTouchMove={handleTouchMove} // Use the new touch handler
        onTouchEnd={handleTouchEnd} // Use the new touch end handler
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
          {arrows.map((arrow) => (
            <Arrow
              key={arrow.id}
              id={arrow.id}
              points={arrow.points}
              stroke={arrow.stroke}
              strokeWidth={arrow.strokeWidth}
              dash={getDashPattern(strokeStyle)}
              pointerLength={15}
              pointerWidth={15}
              fill={arrow.stroke}
              draggable={arrow.draggable}
              onClick={(e) => {
                e.cancelBubble = true;
                handleArrowClick(arrow.id);
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                handleArrowClick(arrow.id);
              }}
              onDragEnd={(e) => handleDragEnd(e, arrow.id)}
              onTransformEnd={(e) => handleTransformEnd(e, arrow.id)}
            />
          ))}
          {newArrow && (
            <Arrow
              points={newArrow.points}
              stroke={newArrow.stroke}
              strokeWidth={newArrow.strokeWidth}
              dash={getDashPattern(strokeStyle)}
              pointerLength={15}
              pointerWidth={15}
              fill={newArrow.stroke}
            />
          )}
          <Transformer
            ref={trRef}
            rotateEnabled={true}
            enabledAnchors={[
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
              "middle-left",
              "middle-right",
              "bottom-center",
              "top-center",
            ]}
            anchorSize={8}
            borderDash={[4, 4]}
          />
        </Layer>
      </Stage>
    );
  }
);

export default ArrowKonva;
