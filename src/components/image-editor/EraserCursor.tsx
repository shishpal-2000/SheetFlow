import { useEffect, useState } from "react";

// Add this component for the eraser cursor
const EraserCursor = ({
  size,
  drawingCanvasRef,
}: {
  size: number;
  drawingCanvasRef: React.RefObject<HTMLCanvasElement>;
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Check if mouse is over the canvas
      const canvas = drawingCanvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const isOverCanvas =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;

        if (isOverCanvas) {
          setPosition({ x: e.clientX, y: e.clientY });
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
        width: size * 2,
        height: size * 2,
        border: "2px solid #ef4444",
        borderRadius: "50%",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        boxShadow: "0 0 10px rgba(239, 68, 68, 0.3)",
        transition: "width 0.1s ease, height 0.1s ease",
      }}
    />
  );
};

export default EraserCursor;
