"use client";
import React, {
  useRef,
  useState,
  forwardRef,
  useEffect,
  useImperativeHandle,
} from "react";
import { Stage, Layer, Circle, Transformer } from "react-konva";
import { StrokeStyle } from "./ImageEditorModal";
import { getDashPattern } from "@/utils/getStrokePattern";
import { KONVA_THRESHOLDS } from "@/utils/konvaThreshold";

export interface KonvaCircleShape {
  id: string;
  x: number;
  y: number;
  radius: number;
  stroke: string;
  strokeWidth: number;
  draggable: boolean;
  dash?: number[]; // Optional dash pattern for stroke
  fill?: string; // Optional fill color prop
}

interface KonvaCircleProps {
  width: number;
  height: number;
  active: boolean;
  color: string;
  setColor: (color: string) => void;
  brushSize: number;
  strokeStyle: StrokeStyle;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  onAdd?: (circle: KonvaCircleShape) => void; // Callback when a new circle is added
  onMove?: (id: string, newData: any, previousData: any) => void; // Add this for history tracking
  circles: KonvaCircleShape[];
  setCircles: React.Dispatch<React.SetStateAction<KonvaCircleShape[]>>;
  onFlatten: (circles: KonvaCircleShape[]) => void;
  onElementSelect?: (elementId: string, elementType: string) => void;
  onElementDeselect?: () => void;
  checkTrashZoneCollision?: (screenX: number, screenY: number) => boolean;
  updateTrashZoneState?: (isOver: boolean) => void;
}

export interface KonvaCircleHandle {
  flatten: () => void;
}

const KonvaCircle = forwardRef<KonvaCircleHandle, KonvaCircleProps>(
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
      onMove, // Destructure onMove prop
      circles,
      setCircles,
      onFlatten,
      onElementSelect,
      onElementDeselect,
      checkTrashZoneCollision,
      updateTrashZoneState,
    },
    ref
  ) => {
    const [newCircle, setNewCircle] = useState<KonvaCircleShape | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const stageRef = useRef<any>(null);
    const trRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      flatten: () => {
        onFlatten(circles);
        setCircles([]);
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
          setCircles((circle) => circle.filter((c) => c.id !== selectedId));
          setSelectedId(null);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedId]);

    // Double click to start a new circle
    const handleStageClick = (e: any) => {
      if (!active) return;

      // Prevent default behavior for touch events
      if (e.evt) {
        e.evt.preventDefault();
      }

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

      const id = `circle-${Date.now()}`;
      setNewCircle({
        id,
        x: pos.x,
        y: pos.y,
        radius: 1,
        stroke: color,
        strokeWidth: brushSize,
        draggable: true,
        dash: getDashPattern(strokeStyle, brushSize),
        fill:
          backgroundColor && backgroundColor !== "transparent"
            ? backgroundColor
            : undefined,
      });
      setSelectedId(id);
    };

    // Drag to set radius
    const handleMouseMove = (e: any) => {
      if (!active || !newCircle) return;

      // Prevent default behavior for touch events
      if (e.evt) {
        e.evt.preventDefault();
      }

      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;

      const dx = pos.x - newCircle.x;
      const dy = pos.y - newCircle.y;
      setNewCircle({
        ...newCircle,
        radius: Math.sqrt(dx * dx + dy * dy),
      });
    };

    const handleMouseUp = (e: any) => {
      if (!active || !newCircle) return;

      // Prevent default behavior for touch events
      if (e.evt) {
        e.evt.preventDefault();
      }

      if (newCircle.radius >= KONVA_THRESHOLDS.MIN_CIRCLE_RADIUS) {
        setCircles((cs) => [...cs, newCircle]);
        if (onAdd) {
          onAdd(newCircle);
        }
      }
      setNewCircle(null);
    };

    const handleCircleClick = (id: string) => {
      setSelectedId(id);
      setColor(circles.find((c) => c.id === id)?.stroke || "#000000");
      setBackgroundColor(
        circles.find((c) => c.id === id)?.fill || "transparent"
      );
      if (onElementSelect) {
        onElementSelect(id, "circle");
      }
    };
    const handleTransformEnd = (e: any, id: string) => {
      const node = e.target;

      // Get the previous circle data before transforming
      const previousCircle = circles.find((c) => c.id === id);

      const scaleX = node.scaleX();

      const newRadius = Math.max(
        node.radius() * scaleX,
        KONVA_THRESHOLDS.MIN_CIRCLE_RADIUS
      );

      node.scaleX(1);
      // node.scaleY(1);

      // Create the new circle data
      const newCircle = {
        ...previousCircle!,
        radius: newRadius,
        x: node.x(),
        y: node.y(),
      };

      setCircles((cs) => cs.map((c) => (c.id === id ? newCircle : c)));

      // Call onMove prop for history tracking if radius or position changed
      if (onMove && previousCircle) {
        const hasChanged =
          previousCircle.radius !== newRadius ||
          previousCircle.x !== node.x() ||
          previousCircle.y !== node.y();

        if (hasChanged) {
          onMove(id, newCircle, previousCircle);
        }
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

      // Get the previous circle data before moving
      const previousCircle = circles.find((c) => c.id === id);

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
        // Delete the element
        setCircles((circles) => circles.filter((c) => c.id !== id));
        setSelectedId(null);
        if (onElementDeselect) onElementDeselect();
        return;
      }

      // Normal drag behavior - update position
      setCircles((circles) =>
        circles.map((c) => (c.id === id ? { ...c, x, y } : c))
      );

      // Call onMove prop for history tracking if position actually changed
      if (
        onMove &&
        previousCircle &&
        (previousCircle.x !== x || previousCircle.y !== y)
      ) {
        const newCircle = { ...previousCircle, x, y };
        onMove(id, newCircle, previousCircle);
      }
    };

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
    }, [selectedId, circles]);

    // Update selected circle's color/backgroundColor when props change
    useEffect(() => {
      if (selectedId) {
        setCircles((cs) =>
          cs.map((c) =>
            c.id === selectedId
              ? {
                  ...c,
                  stroke: color,
                  strokeWidth: brushSize,
                  dash: getDashPattern(strokeStyle, brushSize),
                  ...(backgroundColor &&
                    backgroundColor !== "transparent" && {
                      fill: backgroundColor,
                    }),
                }
              : c
          )
        );
      }
    }, [color, backgroundColor, selectedId, strokeStyle, brushSize]);

    return (
      <Stage
        ref={stageRef}
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
        // Mouse events (Desktop)
        onMouseDown={handleStageClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        // Touch events (Mobile)
        onTouchStart={handleStageClick}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
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
          {circles.map((circle) => (
            <Circle
              key={circle.id}
              id={circle.id}
              x={circle.x}
              y={circle.y}
              radius={circle.radius}
              stroke={circle.stroke}
              strokeWidth={circle.strokeWidth}
              dash={circle.dash}
              draggable={circle.draggable}
              fill={circle.fill}
              onClick={() => handleCircleClick(circle.id)}
              onTap={() => handleCircleClick(circle.id)}
              onDragMove={(e) => handleDragMove(e, circle.id)}
              onDragEnd={(e) => handleDragEnd(e, circle.id)}
              onTransformEnd={(e) => handleTransformEnd(e, circle.id)}
            />
          ))}
          {newCircle && (
            <Circle
              x={newCircle.x}
              y={newCircle.y}
              radius={newCircle.radius}
              stroke={newCircle.stroke}
              strokeWidth={newCircle.strokeWidth}
              dash={newCircle.dash}
              fill={newCircle.fill}
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
            ]}
            anchorSize={8}
            borderDash={[4, 4]}
            keepRatio={true}
          />
        </Layer>
      </Stage>
    );
  }
);

export default KonvaCircle;
