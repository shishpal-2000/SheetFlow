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
    const ctx = this.baseCanvasRef.current?.getContext("2d");
    if (!ctx) return;

    const {
      points,
      color,
      strokeWidth,
      strokeStyle,
      isEraser,
      shape,
      startPoint,
      endPoint,
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
    this.applyStrokeStyle(ctx, strokeStyle, strokeWidth);

    switch (action.type) {
      case "DRAW_PENCIL":
      case "DRAW_ERASER":
        this.drawPath(ctx, points);
        break;

      case "DRAW_LINE":
        this.drawLine(ctx, startPoint!, endPoint!);
        break;

      case "DRAW_CURVE":
      case "DRAW_CURVE_ARROW":
        this.drawPath(ctx, points);
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
          this.applyBlackAndWhiteFilter(ctx);
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

  // private drawCurve(ctx: CanvasRenderingContext2D, points: Point[]): void {
  //   if (points.length < 3) return;

  //   ctx.beginPath();
  //   ctx.moveTo(points[0].x, points[0].y);
  //   for (let i = 1; i < points.length - 1; i++) {
  //     const midPoint = {
  //       x: (points[i].x + points[i + 1].x) / 2,
  //       y: (points[i].y + points[i + 1].y) / 2,
  //     };
  //     ctx.quadraticCurveTo(points[i].x, points[i].y, midPoint.x, midPoint.y);
  //   }
  //   ctx.stroke();
  // }

  // private drawDoubleCurve(
  //   ctx: CanvasRenderingContext2D,
  //   points: Point[]
  // ): void {
  //   if (points.length < 4) return;

  //   ctx.beginPath();
  //   ctx.moveTo(points[0].x, points[0].y);
  //   for (let i = 1; i < points.length - 2; i += 2) {
  //     const midPoint1 = {
  //       x: (points[i].x + points[i + 1].x) / 2,
  //       y: (points[i].y + points[i + 1].y) / 2,
  //     };
  //     const midPoint2 = {
  //       x: (points[i + 1].x + points[i + 2].x) / 2,
  //       y: (points[i + 1].y + points[i + 2].y) / 2,
  //     };
  //     ctx.bezierCurveTo(
  //       points[i].x,
  //       points[i].y,
  //       midPoint1.x,
  //       midPoint1.y,
  //       midPoint2.x,
  //       midPoint2.y
  //     );
  //   }
  //   ctx.stroke();
  // }

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
