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
