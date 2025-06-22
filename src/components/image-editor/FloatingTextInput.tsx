import { useEffect, useRef, useState } from "react";
import { TextStyle } from "./TextTool";

const FloatingTextInput = ({
  position,
  onSubmit,
  textStyle,
  setTextInputPosition,
  availableBackgroundColors,
  setTextStyle,
}: {
  position: { x: number; y: number };
  onSubmit: (text: string) => void;
  textStyle: TextStyle;
  setTextInputPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number } | null>
  >;
  availableBackgroundColors: { name: string; value: string }[];
  setTextStyle: React.Dispatch<React.SetStateAction<TextStyle>>;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputText, setInputText] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputText.trim()) {
      e.preventDefault();
      onSubmit(inputText);
      setInputText("");
      setTextInputPosition(null);
    } else if (e.key === "Escape") {
      setInputText("");
      setTextInputPosition(null);
    }
  };

  const handleBlur = () => {
    if (inputText.trim()) {
      onSubmit(inputText);
      setInputText("");
      setTextInputPosition(null);
    }
  };

  return (
    <div
      className="absolute bg-white/90 p-2 rounded shadow border"
      style={{
        left: position.x,
        top: position.y - textStyle.fontSize / 2,
        zIndex: 10,
        minWidth: "200px",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Type and press Enter..."
        className="w-full bg-transparent border-b outline-none"
        style={{
          color: textStyle.color,
          fontSize: textStyle.fontSize,
          fontFamily: textStyle.fontFamily,
        }}
      />
      <select
        value={textStyle.backgroundColor}
        onChange={(e) =>
          setTextStyle((prev: TextStyle) => ({
            ...prev,
            backgroundColor: e.target.value,
            color: e.target.value === "transparent" ? "#000000" : prev.color,
          }))
        }
        className="mt-2 w-full border rounded h-8"
      >
        {availableBackgroundColors.map((color) => (
          <option key={color.value} value={color.value}>
            {color.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FloatingTextInput;
