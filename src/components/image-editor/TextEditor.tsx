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
}

interface TextEditorProps {
  width: number;
  height: number;
  active: boolean;
  color: string;
  backgroundColor: string;
  fontSize: number;
  fontFamily: string;
  texts: KonvaTextShape[];
  setTexts: React.Dispatch<React.SetStateAction<KonvaTextShape[]>>;
  onFlatten: (texts: KonvaTextShape[]) => void;
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
      backgroundColor,
      fontSize,
      fontFamily,
      texts,
      setTexts,
      onFlatten,
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

    useImperativeHandle(ref, () => ({
      flatten: () => {
        onFlatten(texts);
        setTexts([]);
        setSelectedId(null);
      },
    }));

    // Keyboard delete
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
          setTexts((arr) => arr.filter((t) => t.id !== selectedId));
          setSelectedId(null);
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

    // Drag handler
    const handleDragEnd = (e: any, id: string) => {
      const { x, y } = e.target.position();
      setTexts((arr) => arr.map((t) => (t.id === id ? { ...t, x, y } : t)));
    };

    // Double-click on existing text to edit
    const handleDblClick = (e: any, id: string) => {
      const group = e.target.getParent();
      const textNode = group.findOne("Text");
      const rectNode = group.findOne("Rect");

      setEditingText({
        id,
        x: group.x(),
        y: group.y(),
        value: textNode.text(),
        fill: textNode.fill(),
        backgroundColor: rectNode.fill(),
      });
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
            // background: "transparent",
            // outline: "none",
            // border: "none",
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
                setTexts((arr) => [
                  ...arr,
                  {
                    id: `text-${Date.now()}`,
                    x: editingText.x,
                    y: editingText.y,
                    text: editingText.value,
                    fontSize,
                    fontFamily,
                    fill: color,
                    backgroundColor: backgroundColor,
                    draggable: true,
                  },
                ]);
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
                  draggable={t.draggable}
                  onClick={() => setSelectedId(t.id)}
                  onTap={() => setSelectedId(t.id)}
                  onDblClick={(e) => handleDblClick(e, t.id)}
                  onDragEnd={(e) => handleDragEnd(e, t.id)}
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
