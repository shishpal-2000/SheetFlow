import {
  BaseCanvasAction,
  DrawingAction,
  HistoryAction,
  KonvaAction,
  Point,
} from "@/types/history";
import { getDashPattern } from "./getStrokePattern";

export class CanvasReplayManager {
  public drawingCanvasRef: React.RefObject<HTMLCanvasElement>;
  public baseCanvasRef: React.RefObject<HTMLCanvasElement>;

  constructor(
    drawingCanvasRef: React.RefObject<HTMLCanvasElement>,
    baseCanvasRef: React.RefObject<HTMLCanvasElement>
  ) {
    this.drawingCanvasRef = drawingCanvasRef;
    this.baseCanvasRef = baseCanvasRef;
  }

  clearDrawingCanvas(): void {
    const ctx = this.drawingCanvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.save();

      ctx.globalCompositeOperation = "source-over";
      ctx.setLineDash([]);

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
  }

  clearBaseCanvas(): void {
    const ctx = this.baseCanvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.setLineDash([]);
    }
  }

  applyDrawingAction(action: DrawingAction): void {
    const ctx = this.drawingCanvasRef.current?.getContext("2d");
    if (!ctx) return;

    const {
      points,
      color,
      strokeWidth,
      strokeStyle,
      isEraser,
      startPoint,
      endPoint,
      isPartialCurve,
    } = action.payload;

    ctx.save();

    ctx.globalCompositeOperation = "source-over";

    if (isEraser) {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.strokeStyle = color;
    }

    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Apply stroke style
    // this.applyStrokeStyle(ctx, strokeStyle, strokeWidth);

    switch (action.type) {
      case "DRAW_PENCIL":
      case "DRAW_ERASER":
        this.applyStrokeStyle(ctx, strokeStyle, strokeWidth);
        this.drawPath(ctx, points);
        break;

      case "DRAW_LINE":
        this.applyStrokeStyle(ctx, strokeStyle, strokeWidth);
        this.drawLine(ctx, startPoint!, endPoint!);
        break;

      // case "CURVE_ADD_POINT":
      //   this.applyStrokeStyle(ctx, strokeStyle, strokeWidth);
      //   this.drawPartialCurve(
      //     ctx,
      //     points,
      //     action.type.includes("ARROW"),
      //     color
      //   );
      //   break;

      // case "CURVE_FINALIZE":
      // case "CURVE_ARROW_FINALIZE":
      //   this.drawCurve(ctx, points, action, color);
      //   break;

      case "DRAW_CURVE":
      case "DRAW_CURVE_ARROW":
        this.drawCurve(ctx, points, action, color);
        break;
    }

    ctx.restore();
  }

  applyBaseAction(action: BaseCanvasAction): void {
    const ctx = this.baseCanvasRef.current?.getContext("2d");
    if (!ctx) return;

    switch (action.type) {
      case "APPLY_FILTER":
        if (action.payload.filterType === "blackAndWhite") {
          // For redo, apply the new filtered image data
          if (action.payload.newImageData) {
            ctx.putImageData(action.payload.newImageData, 0, 0);
          } else {
            // Fallback to applying filter directly
            this.applyBlackAndWhiteFilter(ctx);
          }
        }
        break;
      case "CROP_IMAGE":
        if (action.payload.imageData) {
          ctx.putImageData(action.payload.imageData, 0, 0);
        }
        break;
      case "LOAD_IMAGE":
        if (action.payload.imageData) {
          ctx.putImageData(action.payload.imageData, 0, 0);
        }
        break;
      case "FLATTEN_LAYERS":
        // This would be handled by the main component
        break;
    }
  }

  undoBaseAction(action: BaseCanvasAction): void {
    const ctx = this.baseCanvasRef.current?.getContext("2d");
    if (!ctx) return;

    switch (action.type) {
      case "APPLY_FILTER":
        // Restore the previous image data before the filter was applied
        if (action.payload.previousImageData) {
          ctx.putImageData(action.payload.previousImageData, 0, 0);
        }
        break;
      case "CROP_IMAGE":
        // For crop undo, restore the original image data
        if (action.payload.imageData) {
          ctx.putImageData(action.payload.imageData, 0, 0);
        }
        break;
      // Add other undo cases as needed
    }
  }

  private applyStrokeStyle(
    ctx: CanvasRenderingContext2D,
    strokeStyle?: string,
    strokeWidth?: number
  ): void {
    switch (strokeStyle) {
      case "solid":
        ctx.setLineDash(getDashPattern(strokeStyle, strokeWidth || 3));
        break;
      case "dashed":
        ctx.setLineDash(getDashPattern(strokeStyle, strokeWidth || 3));
        break;
      case "dotted":
        ctx.setLineDash(getDashPattern(strokeStyle, strokeWidth || 3));
        break;
      default:
        ctx.setLineDash([]);
        break;
    }
  }

  private drawPath(ctx: CanvasRenderingContext2D, points: Point[]): void {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }

  private drawLine(
    ctx: CanvasRenderingContext2D,
    startPoint: Point,
    endPoint: Point
  ): void {
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.stroke();
  }

  private drawCurve(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    action: DrawingAction,
    color?: string
  ): void {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }

    ctx.stroke();

    // If this is a curve arrow, draw arrows at both ends
    if (action.type === "DRAW_CURVE_ARROW" && points.length >= 2) {
      this.drawArrow(
        ctx,
        points[Math.max(0, points.length - 2)],
        points[points.length - 1],
        action.payload.strokeWidth
      );
      this.drawArrow(ctx, points[1], points[0], action.payload.strokeWidth);
    }
  }

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    size: number
  ): void {
    const headLength = Math.max(10, size * 2);
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    // Calculate the actual end point considering the brush size
    const endX = to.x - Math.cos(angle) * (size / 2);
    const endY = to.y - Math.sin(angle) * (size / 2);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Draw arrow head
    ctx.beginPath();
    // First line of the arrow head
    ctx.moveTo(
      endX - headLength * Math.cos(angle - Math.PI / 6),
      endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(endX, endY);
    // Second line of the arrow head
    ctx.lineTo(
      endX - headLength * Math.cos(angle + Math.PI / 6),
      endY - headLength * Math.sin(angle + Math.PI / 6)
    );

    // Set the line width for the arrow head (slightly thicker for better visibility)
    ctx.lineWidth = Math.max(1, size * 0.8);
    ctx.stroke();
    ctx.restore();
  }

  private drawPartialCurve(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    isArrow: boolean,
    color?: string
  ): void {
    if (points.length <= 1) return;

    console.log("🔴 Drawing partial curve with points:", points);

    // ✅ Use the same curve drawing logic as your CurveTool
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    console.log("🔴 Starting path at:", points[0]);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      console.log(`🔴 Segment ${i}: ${p1.x},${p1.y} → ${p2.x},${p2.y}`);
      console.log(`🔴 Control points: ${cp1x},${cp1y} | ${cp2x},${cp2y}`);

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }

    console.log("🔴 About to stroke");
    ctx.stroke();
  }

  private applyBlackAndWhiteFilter(ctx: CanvasRenderingContext2D): void {
    const imageData = ctx.getImageData(
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height
    );
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = (r + g + b) / 3;

      data[i] = gray; // Red
      data[i + 1] = gray; // Green
      data[i + 2] = gray; // Blue
      // data[i + 3] is alpha, leave unchanged
    }

    ctx.putImageData(imageData, 0, 0);
  }

  replayAllActions(
    actions: HistoryAction[],
    konvaStateUpdaters: {
      setRectangles: (rects: any[]) => void;
      setCircles: (circles: any[]) => void;
      setArrows: (arrows: any[]) => void;
      setDoubleArrows: (arrows: any[]) => void;
      setTexts: (texts: any[]) => void;
    }
  ): void {
    console.log("ReplayAllActions called with:", actions.length, "actions");

    // Clear all canvases and konva states
    this.clearDrawingCanvas();

    const ctx = this.drawingCanvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.globalCompositeOperation = "source-over";
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#000000";
      ctx.fillStyle = "#000000";
    }

    // Clear all Konva states
    konvaStateUpdaters.setRectangles([]);
    konvaStateUpdaters.setCircles([]);
    konvaStateUpdaters.setArrows([]);
    konvaStateUpdaters.setDoubleArrows([]);
    konvaStateUpdaters.setTexts([]);

    const sortedActions = [...actions].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    // const drawingActions: DrawingAction[] = [];
    // const baseActions: BaseCanvasAction[] = [];
    const konvaElements: { [key: string]: any[] } = {
      rectangle: [],
      circle: [],
      arrow: [],
      "double-arrow": [],
      text: [],
    };

    // Sort and group actions
    sortedActions.forEach((action) => {
      switch (action.target) {
        case "drawing":
          this.applyDrawingAction(action as DrawingAction);
          break;
        case "base":
          // this.applyBaseAction(action as BaseCanvasAction);
          break;
        case "konva":
          const konvaAction = action as KonvaAction;
          if (
            konvaAction.type === "ADD_RECTANGLE" ||
            konvaAction.type === "ADD_CIRCLE" ||
            konvaAction.type === "ADD_ARROW" ||
            konvaAction.type === "ADD_DOUBLE_ARROW" ||
            konvaAction.type === "ADD_TEXT"
          ) {
            konvaElements[konvaAction.payload.elementType].push(
              konvaAction.payload.data
            );
          }
          break;
      }
    });

    // Apply base actions first
    // baseActions.forEach((action) => this.applyBaseAction(action));

    // Apply drawing actions
    // drawingActions.forEach((action) => this.applyDrawingAction(action));

    // Update Konva states
    konvaStateUpdaters.setRectangles(konvaElements.rectangle);
    konvaStateUpdaters.setCircles(konvaElements.circle);
    konvaStateUpdaters.setArrows(konvaElements.arrow);
    konvaStateUpdaters.setDoubleArrows(konvaElements["double-arrow"]);
    konvaStateUpdaters.setTexts(konvaElements.text);
  }
}
