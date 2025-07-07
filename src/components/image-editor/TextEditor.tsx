"use client";

import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Stage, Layer, Text, Transformer, Group, Rect } from "react-konva";

export interface KonvaTextShape {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  backgroundColor: string;
  draggable: boolean;
  scaleX?: number;
  scaleY?: number;
}

interface TextEditorProps {
  width: number;
  height: number;
  active: boolean;
  color: string;
  setColor: (color: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  fontSize: number;
  fontFamily: string;
  onAdd?: (text: KonvaTextShape) => void; // Callback when a new text is added
  onMove?: (id: string, newData: any, previousData: any) => void; // Add this for history tracking
  texts: KonvaTextShape[];
  setTexts: React.Dispatch<React.SetStateAction<KonvaTextShape[]>>;
  onFlatten: (texts: KonvaTextShape[]) => void;
  onElementSelect?: (elementId: string, elementType: string) => void;
  onElementDeselect?: () => void;
  checkTrashZoneCollision?: (screenX: number, screenY: number) => boolean;
  updateTrashZoneState?: (isOver: boolean) => void;
}

export interface TextEditorHandle {
  flatten: () => void;
}

const TextEditor = forwardRef<TextEditorHandle, TextEditorProps>(
  (
    {
      width,
      height,
      active,
      color,
      setColor,
      backgroundColor,
      setBackgroundColor,
      fontSize,
      fontFamily,
      onAdd,
      onMove, // Destructure onMove prop
      texts,
      setTexts,
      onFlatten,
      onElementSelect,
      onElementDeselect,
      checkTrashZoneCollision,
      updateTrashZoneState,
    },
    ref
  ) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState<{
      id: string | null;
      x: number;
      y: number;
      value: string;
      fill: string;
      backgroundColor: string;
    } | null>(null);

    const stageRef = useRef<any>(null);
    const trRef = useRef<any>(null);

    // Add state for tracking pinch gesture
    const [lastDist, setLastDist] = useState<number>(0);

    const [lastTap, setLastTap] = useState<number>(0);
    const [tapTimeout, setTapTimeout] = useState<NodeJS.Timeout | null>(null);
    const [tapCount, setTapCount] = useState<number>(0);

    // Helper function to get distance between two touches
    const getDistance = (p1: any, p2: any) => {
      return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    };

    useImperativeHandle(ref, () => ({
      flatten: () => {
        onFlatten(texts);
        setTexts([]);
        setSelectedId(null);
      },
    }));

    useEffect(() => {
      if (stageRef.current) {
        const stage = stageRef.current;

        // Force the stage to use the exact dimensions passed as props
        stage.width(width);
        stage.height(height);
        stage.size({ width, height });

        // Force re-render
        stage.batchDraw();

        console.log("TextEditor stage dimensions updated:", { width, height });
      }
    }, [width, height]);

    useEffect(() => {
      if (stageRef.current && active) {
        const stage = stageRef.current;

        // Get the actual drawing canvas dimensions
        const drawingCanvas = document.querySelector(
          'canvas[class*="absolute w-full h-full"]:last-of-type'
        ) as HTMLCanvasElement;

        if (drawingCanvas) {
          const actualWidth = drawingCanvas.width;
          const actualHeight = drawingCanvas.height;

          console.log("Drawing canvas actual dimensions:", {
            actualWidth,
            actualHeight,
          });
          console.log("TextEditor received dimensions:", { width, height });

          // Update stage to match actual canvas
          stage.width(actualWidth);
          stage.height(actualHeight);
          stage.size({ width: actualWidth, height: actualHeight });
          stage.batchDraw();
        }
      }
    }, [active, width, height]);

    // Keyboard delete
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
          setTexts((arr) => arr.filter((t) => t.id !== selectedId));
          setSelectedId(null);
          if (onElementDeselect) {
            onElementDeselect();
          }
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedId, setTexts]);

    // Transformer selection
    useEffect(() => {
      if (trRef.current && selectedId) {
        const node = stageRef.current.findOne(`#${selectedId}`);
        if (node) {
          trRef.current.nodes([node]);
          trRef.current.getLayer().batchDraw();
        }
      }
    }, [selectedId, texts]);

    useEffect(() => {
      if (selectedId && active) {
        setTexts((arr) =>
          arr.map((t) =>
            t.id === selectedId
              ? {
                  ...t,
                  fill: color,
                  backgroundColor: backgroundColor,
                }
              : t
          )
        );
      }
    }, [color, backgroundColor, selectedId, active]);

    const handleDoubleTap = (e: any, id: string) => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300; // milliseconds

      if (tapTimeout) {
        clearTimeout(tapTimeout);
        setTapTimeout(null);
      }

      if (now - lastTap < DOUBLE_TAP_DELAY && tapCount === 1) {
        // Double tap detected
        setTapCount(0);
        setLastTap(0);

        // Prevent default mobile behavior
        if (e.evt) {
          e.evt.preventDefault();
          e.evt.stopPropagation();
        }

        handleDblClick(e, id);
      } else {
        // First tap
        setLastTap(now);
        setTapCount(1);

        // Set a timeout to reset if no second tap
        const timeout = setTimeout(() => {
          setTapCount(0);
          setLastTap(0);
          setTapTimeout(null);
        }, DOUBLE_TAP_DELAY);

        setTapTimeout(timeout);

        // Still handle normal selection
        setSelectedId(id);
        if (onElementSelect) {
          onElementSelect(id, "text");
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

    // Drag handler
    const handleDragEnd = (e: any, id: string) => {
      const group = e.target;
      const stage = e.target.getStage();
      const { x, y } = group.position();

      // Get the previous text data before moving
      const previousText = texts.find((t) => t.id === id);

      if (updateTrashZoneState) {
        updateTrashZoneState(false);
      }

      // Get the stage's position on screen
      const stageContainer = stage.container();
      const stageRect = stageContainer.getBoundingClientRect();

      // Convert stage coordinates to screen coordinates
      const screenX = stageRect.left + x;
      const screenY = stageRect.top + y;

      // Check if dropped on trash zone
      if (
        checkTrashZoneCollision &&
        checkTrashZoneCollision(screenX, screenY)
      ) {
        // Delete the element
        setTexts((arr) => arr.filter((t) => t.id !== id));
        setSelectedId(null);

        if (trRef.current) {
          trRef.current.nodes([]);
          trRef.current.getLayer().batchDraw();
        }

        if (onElementDeselect) onElementDeselect();
        return;
      }

      // Normal drag behavior - update text position
      const newText = {
        ...previousText!,
        x,
        y,
      };

      setTexts((arr) => arr.map((t) => (t.id === id ? newText : t)));

      // Call onMove prop for history tracking if position actually changed
      if (onMove && previousText) {
        const hasChanged = previousText.x !== x || previousText.y !== y;

        if (hasChanged) {
          onMove(id, newText, previousText);
        }
      }
    };

    // Double-click on existing text to edit
    const handleDblClick = (e: any, id: string) => {
      const group = e.target.getParent();
      const textNode = group.findOne("Text");

      setEditingText({
        id,
        x: group.x(),
        y: group.y(),
        value: textNode.text(),
        fill: color,
        backgroundColor: backgroundColor,
      });
    };

    // Touch handlers for pinch zoom
    const handleTouchMove = (e: any) => {
      if (!active || !selectedId) return;

      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      if (touch1 && touch2) {
        e.evt.preventDefault();

        const dist = getDistance(
          { x: touch1.clientX, y: touch1.clientY },
          { x: touch2.clientX, y: touch2.clientY }
        );

        if (lastDist > 0) {
          const scale = dist / lastDist;

          setTexts((arr) =>
            arr.map((t) =>
              t.id === selectedId
                ? {
                    ...t,
                    scaleX: (t.scaleX || 1) * scale,
                    scaleY: (t.scaleY || 1) * scale,
                  }
                : t
            )
          );
        }
        setLastDist(dist);
      }
    };

    const handleTouchEnd = () => {
      setLastDist(0);
    };

    const handleTextClick = (id: string) => {
      setSelectedId(id);
      setColor(texts.find((t) => t.id === id)?.fill || "#000000");
      setBackgroundColor(
        texts.find((t) => t.id === id)?.backgroundColor || "transparent"
      );
      if (onElementSelect) {
        onElementSelect(id, "text");
      }
    };

    // Double-click on empty canvas to add new text
    const handleStageDblClick = (e: any) => {
      if (!active) return;
      if (e.target !== e.target.getStage()) return;
      const pos = e.target.getStage().getPointerPosition();
      setEditingText({
        id: null,
        x: pos.x,
        y: pos.y,
        value: "",
        fill: color,
        backgroundColor: backgroundColor,
      });
    };

    const handleDeselection = () => {
      if (selectedId) {
        setSelectedId(null);

        // Clear transformer selection
        if (trRef.current) {
          trRef.current.nodes([]);
          trRef.current.getLayer().batchDraw();
        }

        if (onElementDeselect) {
          onElementDeselect();
        }
      }
    };

    // Render textarea overlay for editing/adding text
    const renderTextarea = () => {
      if (!editingText) return null;
      return (
        <textarea
          style={{
            position: "absolute",
            top: editingText.y,
            left: editingText.x,
            fontSize: fontSize,
            fontFamily: fontFamily,
            zIndex: 1000,
            minWidth: 50,
            minHeight: 24,
            background: backgroundColor,
            color: color,
            border: "1px solid #ccc",
            padding: 2,
          }}
          value={editingText.value}
          autoFocus
          onChange={(e) =>
            setEditingText((edit) => edit && { ...edit, value: e.target.value })
          }
          onBlur={() => {
            if (editingText.value.trim()) {
              if (editingText.id) {
                // Edit existing
                setTexts((arr) =>
                  arr.map((t) =>
                    t.id === editingText.id
                      ? {
                          ...t,
                          text: editingText.value,
                          fill: color,
                          backgroundColor: backgroundColor,
                        }
                      : t
                  )
                );
              } else {
                // Add new
                const newId = `text-${Date.now()}`;
                const newText = {
                  id: newId,
                  x: editingText.x,
                  y: editingText.y,
                  text: editingText.value,
                  fontSize,
                  fontFamily,
                  fill: color,
                  backgroundColor: backgroundColor,
                  draggable: true,
                };

                setTexts((arr) => [...arr, newText]);

                if (onAdd && editingText.value.trim().length > 0) {
                  onAdd(newText);
                }

                // Select the newly created text
                setSelectedId(newId);
                if (onElementSelect) {
                  onElementSelect(newId, "text");
                }
              }
            }
            setEditingText(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
            }
            if (e.key === "Escape") {
              setEditingText(null);
            }
          }}
        />
      );
    };

    // Transform handler for scaling
    const handleTransformEnd = (e: any, id: string) => {
      const group = e.target;

      // Get the previous text data before transforming
      const previousText = texts.find((t) => t.id === id);

      // Extract scale and position from the group
      const scaleX = group.scaleX();
      const scaleY = group.scaleY();
      const x = group.x();
      const y = group.y();

      // Create the new text data
      const newText = {
        ...previousText!,
        x,
        y,
        scaleX,
        scaleY,
      };

      // Update text state
      setTexts((arr) => arr.map((t) => (t.id === id ? newText : t)));

      // Call onMove prop for history tracking if transformation changed the text
      if (onMove && previousText) {
        const hasChanged =
          previousText.x !== x ||
          previousText.y !== y ||
          (previousText.scaleX || 1) !== scaleX ||
          (previousText.scaleY || 1) !== scaleY;

        if (hasChanged) {
          onMove(id, newText, previousText);
        }
      }
    };

    return (
      <div style={{ width, height, position: "absolute", inset: 0 }}>
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
          onTouchMove={handleTouchMove} // Add pinch zoom
          onTouchEnd={handleTouchEnd}
          onClick={(e) => {
            const clickedOnEmpty = e.target === e.target.getStage();
            if (clickedOnEmpty) {
              handleDeselection();
            }
          }}
          onTap={(e) => {
            const clickedOnEmpty = e.target === e.target.getStage();
            if (clickedOnEmpty) {
              // Check for double-tap on empty stage for mobile
              const now = Date.now();
              const DOUBLE_TAP_DELAY = 400;

              if (now - lastTap < DOUBLE_TAP_DELAY) {
                // Double tap on empty stage - create new text
                handleStageDblClick(e);
              } else {
                handleDeselection();
              }
              setLastTap(now);
            }
          }}
        >
          <Layer>
            {texts.map((t) => {
              // Create a text node to measure dimensions
              const textNode = document.createElement("span");
              textNode.innerText = t.text;
              textNode.style.fontSize = `${t.fontSize}px`;
              textNode.style.fontFamily = t.fontFamily;
              textNode.style.position = "absolute";
              textNode.style.visibility = "hidden";
              document.body.appendChild(textNode);

              // Get dimensions with padding
              const padding = 10;
              const width = textNode.offsetWidth + padding * 2;
              const height = textNode.offsetHeight + padding * 2;

              document.body.removeChild(textNode);

              return (
                <Group
                  key={t.id}
                  id={t.id}
                  x={t.x}
                  y={t.y}
                  scaleX={t.scaleX || 1}
                  scaleY={t.scaleY || 1}
                  draggable={t.draggable}
                  onClick={() => {
                    handleTextClick(t.id);
                  }}
                  onTap={(e) => {
                    handleTextClick(t.id);
                    handleDoubleTap(e, t.id);
                  }}
                  onDblClick={(e) => handleDblClick(e, t.id)}
                  onDragMove={(e) => handleDragMove(e, t.id)}
                  onDragEnd={(e) => handleDragEnd(e, t.id)}
                  onTransformEnd={(e) => handleTransformEnd(e, t.id)} // Handle transform end
                >
                  <Rect
                    width={width}
                    height={height}
                    fill={t.backgroundColor}
                    cornerRadius={10}
                  />
                  <Text
                    text={t.text}
                    fontSize={t.fontSize}
                    fontFamily={t.fontFamily}
                    fill={t.fill}
                    x={padding}
                    y={padding}
                  />
                </Group>
              );
            })}
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
            />
          </Layer>
        </Stage>
        {renderTextarea()}
      </div>
    );
  }
);

export default TextEditor;
