export interface Point {
  x: number;
  y: number;
}

export type StrokeStyle = "solid" | "dashed" | "dotted";

interface BaseAction {
  id: string;
  timestamp: number;
  target: "drawing" | "konva" | "base";
}

export interface DrawingAction extends BaseAction {
  target: "drawing";
  type:
    | "DRAW_PENCIL"
    | "DRAW_ERASER"
    | "DRAW_LINE"
    | "DRAW_CURVE"
    | "DRAW_CURVE_ARROW";
  payload: {
    points: Point[];
    color: string;
    strokeWidth: number;
    strokeStyle?: StrokeStyle;
    isEraser?: boolean;
    shape?: "line" | "curve" | "curve-arrow";
    startPoint?: Point;
    endPoint?: Point;
    isPartialCurve: boolean;
    curveId?: string;
  };
}

export interface KonvaAction extends BaseAction {
  target: "konva";
  type:
    | "ADD_RECTANGLE"
    | "ADD_CIRCLE"
    | "ADD_ARROW"
    | "ADD_DOUBLE_ARROW"
    | "ADD_TEXT"
    | "MOVE_ELEMENT"
    | "DELETE_ELEMENT"
    | "TRANSFORM_ELEMENT"
    | "MODIFY_ELEMENT";
  payload: {
    elementType: "rectangle" | "circle" | "arrow" | "double-arrow" | "text";
    elementId: string;
    data: any; // The actual element data
    previousData?: any; // For move/transform operations
  };
}

export interface BaseCanvasAction extends BaseAction {
  target: "base";
  type: "APPLY_FILTER" | "CROP_IMAGE" | "FLATTEN_LAYERS" | "LOAD_IMAGE";
  payload: {
    filterType?: "blackAndWhite";
    cropArea?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    imageData?: ImageData;
    previousImageData?: ImageData; // For filter undo
    newImageData?: ImageData; // For filter redo
    canvasWidth?: number;
    canvasHeight?: number;
    shapes?: any[]; // For flattening
    shapeType?: "rectangle" | "circle" | "arrow" | "double-arrow" | "text";
  };
}

export type HistoryAction = DrawingAction | KonvaAction | BaseCanvasAction;

export interface HistoryState {
  actions: HistoryAction[];
  currentStep: number;
  redoStack: HistoryAction[];
}
