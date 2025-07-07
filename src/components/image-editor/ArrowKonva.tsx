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
import { getDashPattern } from "@/utils/getStrokePattern";
import { KONVA_THRESHOLDS } from "@/utils/konvaThreshold";

export interface KonvaArrow {
  id: string;
  points: number[];
  stroke: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  dash: number[];
  draggable: boolean;
}

interface KonvaArrowProps {
  width: number;
  height: number;
  active: boolean;
  color: string;
  setColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  strokeStyle: StrokeStyle;
  setStrokeStyle: (style: StrokeStyle) => void;
  onAdd?: (arrow: KonvaArrow) => void; // Callback when a new arrow is added
  onMove?: (id: string, newData: any, previousData: any) => void; // Add this for history tracking
  arrows: KonvaArrow[];
  setArrows: React.Dispatch<React.SetStateAction<KonvaArrow[]>>;
  onFlatten: (arrows: KonvaArrow[]) => void;
  onElementSelect?: (elementId: string, elementType: string) => void;
  onElementDeselect?: () => void;
  checkTrashZoneCollision?: (screenX: number, screenY: number) => boolean;
  updateTrashZoneState?: (isOver: boolean) => void;
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
      setColor,
      brushSize,
      strokeStyle,
      setStrokeStyle,
      setBrushSize,
      onAdd,
      onMove, // Destructure onMove prop
      arrows,
      setArrows,
      onFlatten,
      onElementSelect,
      onElementDeselect,
      checkTrashZoneCollision,
      updateTrashZoneState,
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

    const constrainToBounds = (
      points: number[],
      canvasWidth: number,
      canvasHeight: number
    ) => {
      const [x1, y1, x2, y2] = points;

      // Constrain each point to canvas bounds
      const constrainedX1 = Math.max(0, Math.min(canvasWidth, x1));
      const constrainedY1 = Math.max(0, Math.min(canvasHeight, y1));
      const constrainedX2 = Math.max(0, Math.min(canvasWidth, x2));
      const constrainedY2 = Math.max(0, Math.min(canvasHeight, y2));

      return [constrainedX1, constrainedY1, constrainedX2, constrainedY2];
    };

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

    // Update selected arrow's color in real time when color changes
    useEffect(() => {
      if (selectedId) {
        setArrows((arrs) =>
          arrs.map((a) =>
            a.id === selectedId
              ? {
                  ...a,
                  stroke: color,
                  strokeWidth: brushSize,
                  strokeStyle: strokeStyle,
                  dash: getDashPattern(strokeStyle, brushSize),
                }
              : a
          )
        );
      }
    }, [color, selectedId, brushSize, strokeStyle]);

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

      if (selectedId) {
        setSelectedId(null);
        if (onElementDeselect) {
          onElementDeselect();
        }
      }

      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;

      const id = `arrow-${Date.now()}`;
      setNewArrow({
        id,
        points: [pos.x, pos.y, pos.x, pos.y],
        stroke: color,
        strokeWidth: brushSize,
        strokeStyle,
        dash: getDashPattern(strokeStyle, brushSize),
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

      // Constrain mouse position to canvas bounds
      const constrainedX = Math.max(0, Math.min(width, pos.x));
      const constrainedY = Math.max(0, Math.min(height, pos.y));

      setNewArrow({
        ...newArrow,
        points: [
          newArrow.points[0],
          newArrow.points[1],
          constrainedX,
          constrainedY,
        ],
      });
    };

    const handleMouseUp = (e: any) => {
      if (!active || !newArrow) return;

      // Prevent default behavior for touch events
      if (e.evt) {
        e.evt.preventDefault();
      }

      // Calculate arrow length to validate if it's substantial enough
      const [x1, y1, x2, y2] = newArrow.points;
      const arrowLength = Math.sqrt(
        Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)
      );

      if (arrowLength >= KONVA_THRESHOLDS.MIN_ARROW_LENGTH) {
        setArrows((arrs) => [...arrs, newArrow]);
        if (onAdd) {
          onAdd(newArrow);
        }
      }
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
      console.log("Arrow clicked:", id);
      const clickedArrow = arrows.find((a) => a.id === id);

      setSelectedId(id);
      setColor(clickedArrow?.stroke || "#000000");
      if (clickedArrow?.strokeStyle) {
        setStrokeStyle(clickedArrow.strokeStyle);
      }
      setBrushSize(clickedArrow?.strokeWidth || 3);

      if (onElementSelect) {
        onElementSelect(id, "arrow");
      }
    };

    const handleTransformEnd = (e: any, id: string) => {
      const node = e.target;

      // Get the previous arrow data before transforming
      const previousArrow = arrows.find((a) => a.id === id);

      // Reset transformations after applying them
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const rotation = node.rotation();
      const x = node.x();
      const y = node.y();

      const oldPoints = node.points();

      // Calculate the center of the arrow
      const centerX = (oldPoints[0] + oldPoints[2]) / 2;
      const centerY = (oldPoints[1] + oldPoints[3]) / 2;

      // Calculate the original length and angle
      const originalLength = Math.sqrt(
        Math.pow(oldPoints[2] - oldPoints[0], 2) +
          Math.pow(oldPoints[3] - oldPoints[1], 2)
      );
      const originalAngle = Math.atan2(
        oldPoints[3] - oldPoints[1],
        oldPoints[2] - oldPoints[0]
      );

      // Apply scaling to length
      const newLength = originalLength * Math.max(scaleX, scaleY);

      // Apply rotation
      const newAngle = originalAngle + (rotation * Math.PI) / 180;

      // Calculate new points, keeping the center fixed
      const halfLength = newLength / 2;
      let newPoints = [
        centerX - halfLength * Math.cos(newAngle),
        centerY - halfLength * Math.sin(newAngle),
        centerX + halfLength * Math.cos(newAngle),
        centerY + halfLength * Math.sin(newAngle),
      ];

      // Constrain the arrow within the canvas boundaries
      const constrainedPoints = constrainToBounds(newPoints, width, height);

      // Reset node transformations
      node.scaleX(1);
      node.scaleY(1);
      node.rotation(0);
      node.x(0);
      node.y(0);

      // Create the new arrow data
      const newArrow = {
        ...previousArrow!,
        points: constrainedPoints,
        stroke: color,
        strokeWidth: brushSize,
        strokeStyle: strokeStyle,
        dash: getDashPattern(strokeStyle, brushSize),
      };

      // Update the arrow state
      setArrows((arrs) => arrs.map((a) => (a.id === id ? newArrow : a)));

      // Call onMove prop for history tracking if transformation changed the arrow
      if (onMove && previousArrow) {
        const hasChanged = !previousArrow.points.every(
          (point, index) => point === constrainedPoints[index]
        );

        if (hasChanged) {
          onMove(id, newArrow, previousArrow);
        }
      }
    };

    const handleDragMove = (e: any, id: string) => {
      const stage = e.target.getStage();
      const node = e.target;
      const { x, y } = node.position();

      // Get the arrow's points to calculate center
      const oldPoints = node.points();
      const centerX = (oldPoints[0] + oldPoints[2]) / 2;
      const centerY = (oldPoints[1] + oldPoints[3]) / 2;

      // Get screen coordinates for trash detection
      const stageContainer = stage.container();
      const stageRect = stageContainer.getBoundingClientRect();

      // Use the arrow's center point plus drag offset
      const screenX = stageRect.left + centerX + x;
      const screenY = stageRect.top + centerY + y;

      // Check collision with trash zone
      if (checkTrashZoneCollision && updateTrashZoneState) {
        const isOverTrash = checkTrashZoneCollision(screenX, screenY);
        updateTrashZoneState(isOverTrash);
      }
    };

    const handleDragEnd = (e: any, id: string) => {
      const node = e.target;
      const stage = e.target.getStage();
      const x = node.x();
      const y = node.y();

      // Get the previous arrow data before moving
      const previousArrow = arrows.find((a) => a.id === id);

      if (updateTrashZoneState) {
        updateTrashZoneState(false);
      }

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
      if (
        checkTrashZoneCollision &&
        checkTrashZoneCollision(screenX, screenY)
      ) {
        // Delete the element
        setArrows((arrs) => arrs.filter((a) => a.id !== id));
        setSelectedId(null);
        if (onElementDeselect) onElementDeselect();
        return;
      }

      // Normal drag behavior - update arrow position
      const dx = x;
      const dy = y;
      let newPoints = [
        oldPoints[0] + dx,
        oldPoints[1] + dy,
        oldPoints[2] + dx,
        oldPoints[3] + dy,
      ];

      // Constrain arrow to canvas bounds
      newPoints = constrainToBounds(newPoints, width, height);

      node.x(0);
      node.y(0);

      // Create the new arrow data
      const newArrow = {
        ...previousArrow!,
        points: newPoints,
        stroke: color,
        strokeWidth: brushSize,
        strokeStyle: strokeStyle,
        dash: getDashPattern(strokeStyle, brushSize),
      };

      setArrows((arrs) => arrs.map((a) => (a.id === id ? newArrow : a)));

      // Call onMove prop for history tracking if position actually changed
      if (onMove && previousArrow) {
        const hasChanged = !previousArrow.points.every(
          (point, index) => point === newPoints[index]
        );

        if (hasChanged) {
          onMove(id, newArrow, previousArrow);
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
          if (clickedOnEmpty && selectedId) {
            setSelectedId(null);
            if (onElementDeselect) {
              onElementDeselect();
            }
          }
        }}
        onTap={(e) => {
          const clickedOnEmpty = e.target === e.target.getStage();
          if (clickedOnEmpty && selectedId) {
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
              hitStrokeWidth={Math.max(60, arrow.strokeWidth * 4)}
              perfectDrawEnabled={false}
              dash={arrow.dash}
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
              onDragMove={(e) => handleDragMove(e, arrow.id)}
              onDragEnd={(e) => handleDragEnd(e, arrow.id)}
              onTransformEnd={(e) => handleTransformEnd(e, arrow.id)}
            />
          ))}
          {newArrow && (
            <Arrow
              points={newArrow.points}
              stroke={newArrow.stroke}
              strokeWidth={newArrow.strokeWidth}
              hitStrokeWidth={Math.max(90, newArrow.strokeWidth * 4)}
              perfectDrawEnabled={false}
              dash={newArrow.dash}
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
