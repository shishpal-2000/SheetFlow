export interface KonvaArrow {
  id: string;
  points: number[];
  stroke: string;
  strokeWidth: number;
  draggable: boolean;
}

export interface KonvaArrowHandle {
  flatten: () => void;
}
