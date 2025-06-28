"use client";
import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Stage, Layer, Arrow, Transformer } from "react-konva";

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
  arrows: KonvaArrow[];
  setArrows: React.Dispatch<React.SetStateAction<KonvaArrow[]>>;
  onFlatten: (arrows: KonvaArrow[]) => void;
}

export interface KonvaArrowHandle {
  flatten: () => void;
}

const ArrowKonva = forwardRef<KonvaArrowHandle, KonvaArrowProps>(
  (
    { width, height, active, color, brushSize, arrows, setArrows, onFlatten },
    ref
  ) => {
    const [newArrow, setNewArrow] = useState<KonvaArrow | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const stageRef = useRef<any>(null);
    const trRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      flatten: () => {
        onFlatten(arrows);
        setArrows([]);
        setSelectedId(null);
      },
    }));

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
      if (trRef.current && selectedId) {
        const node = stageRef.current.findOne(`#${selectedId}`);
        if (node) {
          trRef.current.nodes([node]);
          trRef.current.getLayer().batchDraw();
        }
      }
    }, [selectedId, arrows]);

    // Drawing logic
    // Use double-click to start drawing a new arrow
    const handleStageDblClick = (e: any) => {
      if (!active) return;
      const clickedOnEmpty = e.target === e.target.getStage();
      if (!clickedOnEmpty) return;
      const pos = e.target.getStage().getPointerPosition();
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

    // Only update arrow end point on mouse move/up if drawing
    const handleMouseMove = (e: any) => {
      if (!active || !newArrow) return;
      const pos = e.target.getStage().getPointerPosition();
      setNewArrow({
        ...newArrow,
        points: [newArrow.points[0], newArrow.points[1], pos.x, pos.y],
      });
    };

    const handleMouseUp = () => {
      if (!active || !newArrow) return;
      setArrows((arrs) => [...arrs, newArrow]);
      setNewArrow(null);
    };

    const handleArrowClick = (id: string) => {
      setSelectedId(id);
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
      const x = node.x();
      const y = node.y();
      const oldPoints = node.points();

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
        onDblClick={handleStageDblClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          {arrows.map((arrow) => (
            <Arrow
              key={arrow.id}
              id={arrow.id}
              points={arrow.points}
              stroke={arrow.stroke}
              strokeWidth={arrow.strokeWidth}
              pointerLength={15}
              pointerWidth={15}
              fill={arrow.stroke}
              draggable={arrow.draggable}
              onClick={() => handleArrowClick(arrow.id)}
              onTap={() => handleArrowClick(arrow.id)}
              onDragEnd={(e) => handleDragEnd(e, arrow.id)}
              onTransformEnd={(e) => handleTransformEnd(e, arrow.id)}
            />
          ))}
          {newArrow && (
            <Arrow
              points={newArrow.points}
              stroke={newArrow.stroke}
              strokeWidth={newArrow.strokeWidth}
              pointerLength={15}
              pointerWidth={15}
              fill={newArrow.stroke}
              dash={[4, 4]}
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
