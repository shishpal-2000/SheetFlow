// import React, { useEffect, useState } from "react";

// interface TextBox {
//   id: number;
//   text: string;
//   x: number;
//   y: number;
//   textColor: string;
//   bgColor: string;
//   isDragging: boolean;
//   offsetX: number;
//   offsetY: number;
// }

// interface TextToolProps {
//   canvasRef: React.RefObject<HTMLCanvasElement>;
// }

// const TextTool: React.FC<TextToolProps> = ({ canvasRef }) => {
//   const [text, setText] = useState("");
//   const [bgColor, setBgColor] = useState("#ffffff");
//   const [textColor, setTextColor] = useState("#000000");
//   const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
//   const [draggingId, setDraggingId] = useState<number | null>(null);

//   useEffect(() => {
//     if (canvasRef?.current) {
//       drawCanvas();
//     }
//   }, [textBoxes, canvasRef]);

//   const drawCanvas = () => {
//     const canvas = canvasRef?.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     ctx.clearRect(0, 0, canvas.width, canvas.height);

//     textBoxes.forEach((box) => {
//       const lines = box.text.split("\n");
//       const padding = 6;
//       const lineHeight = 20;
//       const maxLineWidth = Math.max(
//         ...lines.map((line) => ctx.measureText(line).width)
//       );
//       const boxWidth = maxLineWidth + padding * 2;
//       const boxHeight = lines.length * lineHeight + padding * 2;

//       ctx.fillStyle = box.bgColor;
//       ctx.beginPath();
//       const radius = 8;
//       ctx.moveTo(box.x + radius, box.y);
//       ctx.lineTo(box.x + boxWidth - radius, box.y);
//       ctx.quadraticCurveTo(
//         box.x + boxWidth,
//         box.y,
//         box.x + boxWidth,
//         box.y + radius
//       );
//       ctx.lineTo(box.x + boxWidth, box.y + boxHeight - radius);
//       ctx.quadraticCurveTo(
//         box.x + boxWidth,
//         box.y + boxHeight,
//         box.x + boxWidth - radius,
//         box.y + boxHeight
//       );
//       ctx.lineTo(box.x + radius, box.y + boxHeight);
//       ctx.quadraticCurveTo(
//         box.x,
//         box.y + boxHeight,
//         box.x,
//         box.y + boxHeight - radius
//       );
//       ctx.lineTo(box.x, box.y + radius);
//       ctx.quadraticCurveTo(box.x, box.y, box.x + radius, box.y);
//       ctx.closePath();
//       ctx.fill();

//       ctx.fillStyle = box.textColor;
//       ctx.font = "16px sans-serif";
//       lines.forEach((line, index) => {
//         ctx.fillText(
//           line,
//           box.x + padding,
//           box.y + padding + (index + 1) * lineHeight - 6
//         );
//       });
//     });
//   };

//   const addTextBox = () => {
//     if (text.trim() === "") return;
//     setTextBoxes([
//       ...textBoxes,
//       {
//         id: Date.now(),
//         text,
//         x: 50,
//         y: 50,
//         textColor,
//         bgColor,
//         isDragging: false,
//         offsetX: 0,
//         offsetY: 0,
//       },
//     ]);
//     setText("");
//   };

//   const handleMouseDown = (
//     e: React.MouseEvent<HTMLCanvasElement, MouseEvent>
//   ) => {
//     const canvas = canvasRef?.current;
//     if (!canvas) return;
//     const rect = canvas.getBoundingClientRect();
//     const x = e.clientX - rect.left;
//     const y = e.clientY - rect.top;
//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     for (let i = textBoxes.length - 1; i >= 0; i--) {
//       const box = textBoxes[i];
//       const padding = 6;
//       const lines = box.text.split("\n");
//       const maxLineWidth = Math.max(
//         ...lines.map((line) => ctx.measureText(line).width)
//       );
//       const lineHeight = 20;
//       const boxWidth = maxLineWidth + padding * 2;
//       const boxHeight = lines.length * lineHeight + padding * 2;

//       if (
//         x >= box.x &&
//         x <= box.x + boxWidth &&
//         y >= box.y &&
//         y <= box.y + boxHeight
//       ) {
//         setDraggingId(box.id);
//         setTextBoxes((prev) =>
//           prev.map((b) =>
//             b.id === box.id
//               ? { ...b, isDragging: true, offsetX: x - b.x, offsetY: y - b.y }
//               : b
//           )
//         );
//         return;
//       }
//     }
//   };

//   const handleMouseMove = (
//     e: React.MouseEvent<HTMLCanvasElement, MouseEvent>
//   ) => {
//     if (draggingId === null) return;
//     const canvas = canvasRef?.current;
//     if (!canvas) return;
//     const rect = canvas.getBoundingClientRect();
//     const x = e.clientX - rect.left;
//     const y = e.clientY - rect.top;

//     setTextBoxes((prev) =>
//       prev.map((box) => {
//         if (box.id === draggingId && box.isDragging) {
//           return {
//             ...box,
//             x: x - box.offsetX,
//             y: y - box.offsetY,
//           };
//         }
//         return box;
//       })
//     );
//   };

//   const handleMouseUp = () => {
//     setDraggingId(null);
//     setTextBoxes((prev) => prev.map((box) => ({ ...box, isDragging: false })));
//   };

//   return (
//     <div className="p-4 bg-gray-100">
//       <div className="mb-4 flex flex-wrap items-center gap-2 bg-white p-4 rounded-xl shadow-md">
//         <textarea
//           value={text}
//           onChange={(e) => setText(e.target.value)}
//           placeholder="Enter text (use Enter for new lines)"
//           className="border p-2 rounded w-48 h-24 resize-none"
//         />
//         <label className="flex items-center gap-1">
//           BG Color:
//           <input
//             type="color"
//             value={bgColor}
//             onChange={(e) => setBgColor(e.target.value)}
//           />
//         </label>
//         <label className="flex items-center gap-1">
//           Text Color:
//           <input
//             type="color"
//             value={textColor}
//             onChange={(e) => setTextColor(e.target.value)}
//           />
//         </label>
//         <button
//           onClick={addTextBox}
//           className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
//         >
//           Add Text
//         </button>
//       </div>
//     </div>
//   );
// };

// export default TextTool;

// import React, { useState } from "react";
// import FloatingTextInput from "./FloatingTextInput";

// export interface TextStyle {
//   fontSize: number;
//   fontFamily: string;
//   color: string;
//   backgroundColor: string;
// }

// const defaultTextStyle: TextStyle = {
//   fontSize: 16,
//   fontFamily: "sans-serif",
//   color: "#000000",
//   backgroundColor: "transparent",
// };

// const availableBackgroundColors = [
//   { name: "White", value: "#ffffff" },
//   { name: "Black", value: "#000000" },
//   { name: "Red", value: "#ff0000" },
//   { name: "Green", value: "#00ff00" },
//   { name: "Blue", value: "#0000ff" },
//   { name: "Transparent", value: "transparent" },
// ];

// interface TextToolProps {
//   drawingCanvasRef: React.RefObject<HTMLCanvasElement>;
//   saveHistory?: () => void;
// }

// const TextTool: React.FC<TextToolProps> = ({
//   drawingCanvasRef,
//   saveHistory,
// }) => {
//   const [textInputPosition, setTextInputPosition] = useState<{
//     x: number;
//     y: number;
//   } | null>(null);
//   const [textStyle, setTextStyle] = useState<TextStyle>(defaultTextStyle);

//   const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
//     const canvas = drawingCanvasRef.current;
//     if (!canvas) return;
//     const rect = canvas.getBoundingClientRect();
//     const x = e.clientX - rect.left;
//     const y = e.clientY - rect.top;
//     setTextInputPosition({ x, y });
//   };

//   const drawText = (
//     ctx: CanvasRenderingContext2D,
//     x: number,
//     y: number,
//     text: string,
//     style: TextStyle
//   ) => {
//     ctx.font = `${style.fontSize}px ${style.fontFamily}`;
//     const lines = text.split("\n");
//     const lineHeight = style.fontSize * 1.2;

//     lines.forEach((line, i) => {
//       const lineY = y + i * lineHeight;
//       if (style.backgroundColor && style.backgroundColor !== "transparent") {
//         const metrics = ctx.measureText(line);
//         ctx.fillStyle = style.backgroundColor;
//         ctx.fillRect(
//           x,
//           lineY - style.fontSize,
//           metrics.width,
//           style.fontSize * 1.2
//         );
//       }
//       ctx.fillStyle = style.color;
//       ctx.fillText(line, x, lineY);
//     });
//   };

//   return (
//     <div className="relative w-full h-full">
//       {textInputPosition && (
//         <FloatingTextInput
//           position={textInputPosition}
//           textStyle={textStyle}
//           setTextInputPosition={setTextInputPosition}
//           setTextStyle={setTextStyle}
//           availableBackgroundColors={availableBackgroundColors}
//           onSubmit={(submittedText: string) => {
//             const canvas = drawingCanvasRef.current;
//             const ctx = canvas?.getContext("2d");
//             if (!canvas || !ctx) return;

//             drawText(
//               ctx,
//               textInputPosition.x,
//               textInputPosition.y,
//               submittedText,
//               textStyle
//             );
//             setTextInputPosition(null);
//             saveHistory?.();
//           }}
//         />
//       )}
//       <canvas
//         ref={drawingCanvasRef}
//         className="border rounded w-full h-full"
//         width={800}
//         height={600}
//         onClick={handleCanvasClick}
//       />
//     </div>
//   );
// };

// export default TextTool;

import React, { useEffect, useRef, useState } from "react";

export interface TextStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
}

interface TextToolProps {
  drawingCanvasRef: React.RefObject<HTMLCanvasElement>;
  saveHistory?: () => void;
}

const defaultTextStyle: TextStyle = {
  fontSize: 20,
  fontFamily: "sans-serif",
  color: "#000000",
  backgroundColor: "#ffffff",
};

function drawText(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  style: {
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor: string;
  }
) {
  ctx.font = `${style.fontSize}px ${style.fontFamily}`;
  const metrics = ctx.measureText(text);
  const padding = 8;
  const textHeight = style.fontSize * 1.2;

  // Background
  if (style.backgroundColor && style.backgroundColor !== "transparent") {
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(
      x - padding / 2,
      y - style.fontSize,
      metrics.width + padding,
      textHeight + padding / 2
    );
  }

  // Text
  ctx.fillStyle = style.color;
  ctx.fillText(text, x, y);
}

const TextTool: React.FC<TextToolProps> = ({
  drawingCanvasRef,
  saveHistory,
}) => {
  const [textBox, setTextBox] = useState<{
    x: number;
    y: number;
    text: string;
    isDragging: boolean;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [textStyle, setTextStyle] = useState<TextStyle>(defaultTextStyle);
  const tempCanvasRef = useRef<HTMLCanvasElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Start a new textbox on canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (textBox) return; // Prevent placing multiple text boxes

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTextBox({ x, y, text: "", isDragging: false, offsetX: 0, offsetY: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!textBox) return;
    const box = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - box.left;
    const offsetY = e.clientY - box.top;
    setTextBox(
      (prev) => prev && { ...prev, isDragging: true, offsetX, offsetY }
    );
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!textBox?.isDragging) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const newX = e.clientX - rect.left - textBox.offsetX;
    const newY = e.clientY - rect.top - textBox.offsetY;
    setTextBox((prev) => prev && { ...prev, x: newX, y: newY });
  };

  const handleMouseUp = () => {
    if (textBox?.isDragging) {
      setTextBox((prev) => prev && { ...prev, isDragging: false });
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  });

  const handleTextSubmit = () => {
    if (!textBox || !textBox.text.trim()) return;
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    drawText(ctx, textBox.x, textBox.y, textBox.text.trim(), textStyle);
    setTextBox(null);
    saveHistory?.();
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={drawingCanvasRef}
        className="border rounded w-full h-full"
        width={800}
        height={600}
        onClick={handleCanvasClick}
      />

      <canvas
        ref={tempCanvasRef}
        width={800}
        height={600}
        className="absolute z-10"
      />

      {textBox && (
        <div
          className="absolute cursor-move p-2 rounded-lg shadow-md border"
          style={{
            left: textBox.x,
            top: textBox.y,
            backgroundColor: textStyle.backgroundColor,
            color: textStyle.color,
            fontSize: textStyle.fontSize,
            fontFamily: textStyle.fontFamily,
            minWidth: 100,
            maxWidth: 300,
            zIndex: 10,
          }}
          onMouseDown={handleMouseDown}
        >
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={textBox.text}
            onChange={(e) =>
              setTextBox((prev) => prev && { ...prev, text: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleTextSubmit();
              } else if (e.key === "Escape") {
                setTextBox(null);
              }
            }}
            onBlur={handleTextSubmit}
            className="bg-transparent outline-none w-full"
            style={{
              color: textStyle.color,
              fontSize: textStyle.fontSize,
              fontFamily: textStyle.fontFamily,
            }}
            placeholder="Type text and press Enter"
          />
        </div>
      )}
    </div>
  );
};

export default TextTool;
