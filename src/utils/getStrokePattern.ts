import { StrokeStyle } from "@/components/image-editor/ImageEditorModal";

export const getDashPattern = (
  style: StrokeStyle,
  strokeWidth: number
): number[] => {
  switch (style) {
    case "solid":
      return [];
    case "dashed":
      return [strokeWidth * 3, strokeWidth * 2];
    case "dotted":
      return [strokeWidth, strokeWidth];
    default:
      return [];
  }
};

export const getStrokeStyle = (dash: number[]): StrokeStyle => {
  if (dash.length === 0) {
    return "solid";
  } else if (dash.length === 2) {
    return "dashed";
  } else if (dash.length === 1) {
    return "dotted";
  } else {
    return "solid";
  }
};
