import {
  HistoryAction,
  DrawingAction,
  KonvaAction,
  BaseCanvasAction,
  Point,
  StrokeStyle,
} from "../types/history";

export class ActionCreators {
  static createDrawingAction(
    type: DrawingAction["type"],
    points: Point[],
    color: string,
    strokeWidth: number,
    strokeStyle?: StrokeStyle,
    isEraser?: boolean,
    shape?: "line" | "curve" | "curve-arrow",
    startPoint?: Point,
    endPoint?: Point,
    isPartialCurve?: boolean
  ): DrawingAction {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      target: "drawing",
      type,
      payload: {
        points,
        color,
        strokeWidth,
        strokeStyle,
        isEraser,
        shape,
        startPoint,
        endPoint,
        isPartialCurve: isPartialCurve ?? false, // Default to false for completed actions
        curveId: "", // Optional, can be set later if needed
      },
    };
  }

  static createKonvaAction(
    type: KonvaAction["type"],
    elementType: KonvaAction["payload"]["elementType"],
    elementId: string,
    data: any,
    previousData?: any
  ): KonvaAction {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      target: "konva",
      type,
      payload: {
        elementType,
        elementId,
        data,
        previousData,
      },
    };
  }

  static createBaseAction(
    type: BaseCanvasAction["type"],
    payload: BaseCanvasAction["payload"]
  ): BaseCanvasAction {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      target: "base",
      type,
      payload,
    };
  }

  // Specific action creators for common operations
  static pencilStroke(
    points: Point[],
    color: string,
    strokeWidth: number,
    strokeStyle?: StrokeStyle
  ): DrawingAction {
    return this.createDrawingAction(
      "DRAW_PENCIL",
      points,
      color,
      strokeWidth,
      strokeStyle
    );
  }

  static eraserStroke(points: Point[], strokeWidth: number): DrawingAction {
    return this.createDrawingAction(
      "DRAW_ERASER",
      points,
      "",
      strokeWidth,
      undefined,
      true
    );
  }

  static drawLine(
    color: string,
    startPoint: Point,
    endPoint: Point,
    strokeWidth: number,
    strokeStyle?: StrokeStyle
  ): DrawingAction {
    return this.createDrawingAction(
      "DRAW_LINE",
      [startPoint, endPoint],
      color,
      strokeWidth,
      strokeStyle,
      false,
      "line",
      startPoint,
      endPoint
    );
  }

  static drawCurve(
    points: Point[],
    color: string,
    strokeWidth: number,
    strokeStyle?: StrokeStyle
  ): DrawingAction {
    return this.createDrawingAction(
      "DRAW_CURVE",
      points,
      color,
      strokeWidth,
      strokeStyle,
      false,
      "curve"
    );
  }

  static drawDoubleCurve(
    points: Point[],
    color: string,
    strokeWidth: number,
    strokeStyle?: StrokeStyle
  ): DrawingAction {
    return this.createDrawingAction(
      "DRAW_CURVE_ARROW",
      points,
      color,
      strokeWidth,
      strokeStyle,
      false,
      "curve-arrow",
      points[0], // Assuming the first point is the start
      points[points.length - 1] // Assuming the last point is the end
    );
  }

  static addRectangle(rectangle: any): KonvaAction {
    return this.createKonvaAction(
      "ADD_RECTANGLE",
      "rectangle",
      rectangle.id,
      rectangle
    );
  }

  static addCircle(circle: any): KonvaAction {
    return this.createKonvaAction("ADD_CIRCLE", "circle", circle.id, circle);
  }

  static addArrow(arrow: any): KonvaAction {
    return this.createKonvaAction("ADD_ARROW", "arrow", arrow.id, arrow);
  }

  static addDoubleArrow(doubleArrow: any): KonvaAction {
    return this.createKonvaAction(
      "ADD_DOUBLE_ARROW",
      "double-arrow",
      doubleArrow.id,
      doubleArrow
    );
  }

  static addText(text: any): KonvaAction {
    return this.createKonvaAction("ADD_TEXT", "text", text.id, text);
  }

  static deleteElement(
    elementType: KonvaAction["payload"]["elementType"],
    elementId: string,
    elementData: any
  ): KonvaAction {
    return this.createKonvaAction(
      "DELETE_ELEMENT",
      elementType,
      elementId,
      elementData
    );
  }

  static moveKonvaShape(
    elementType: KonvaAction["payload"]["elementType"],
    elementId: string,
    newData: any,
    previousData: any
  ): KonvaAction {
    return this.createKonvaAction(
      "MOVE_ELEMENT",
      elementType,
      elementId,
      newData,
      previousData
    );
  }

  static cropImage(cropArea: any, imageData: ImageData): BaseCanvasAction {
    return this.createBaseAction("CROP_IMAGE", { cropArea, imageData });
  }

  static applyFilter(
    filterType: "blackAndWhite",
    previousImageData: ImageData,
    newImageData: ImageData
  ): BaseCanvasAction {
    return this.createBaseAction("APPLY_FILTER", {
      filterType,
      previousImageData,
      newImageData,
    });
  }
}

export function handleKonvaShapeMove(
  elementType: KonvaAction["payload"]["elementType"],
  elementId: string,
  newData: any,
  previousData: any
): KonvaAction {
  return ActionCreators.moveKonvaShape(
    elementType,
    elementId,
    newData,
    previousData
  );
}
