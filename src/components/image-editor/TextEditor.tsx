"use client";
import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Stage, Layer, Text, Transformer } from "react-konva";

export interface KonvaTextShape {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  draggable: boolean;
}

interface TextEditorProps {
  width: number;
  height: number;
  active: boolean;
  color: string;
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
      const textNode = e.target;
      setEditingText({
        id,
        x: textNode.x(),
        y: textNode.y(),
        value: textNode.text(),
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
            background: "white",
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
                      ? { ...t, text: editingText.value }
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
            {texts.map((t) => (
              <Text
                key={t.id}
                id={t.id}
                x={t.x}
                y={t.y}
                text={t.text}
                fontSize={t.fontSize}
                fontFamily={t.fontFamily}
                fill={t.fill}
                draggable={t.draggable}
                onClick={() => setSelectedId(t.id)}
                onTap={() => setSelectedId(t.id)}
                onDblClick={(e) => handleDblClick(e, t.id)}
                onDragEnd={(e) => handleDragEnd(e, t.id)}
              />
            ))}
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
