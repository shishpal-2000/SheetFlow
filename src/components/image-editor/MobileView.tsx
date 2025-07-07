"use client";

import {
  ArrowRight,
  ArrowRightLeft,
  Circle,
  Crop,
  DotIcon,
  Eraser,
  Grip,
  Minus,
  MinusIcon,
  Palette,
  Pencil,
  PenTool,
  Plus,
  Redo2,
  Square,
  Type,
  Undo2,
} from "lucide-react";
import { TbArrowCurveRight } from "react-icons/tb";
import { Button } from "../ui/button";
import { DrawingTool, StrokeStyle } from "./ImageEditorModal";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import Curve from "../ui/Icons/curve";
import DoubleArrowCurve from "../ui/Icons/curve-double-arrow";
import { useEffect } from "react";
import { HistoryAction } from "@/types/history";

interface MobileViewProps {
  undo: () => void;
  canUndo: boolean;
  historyStep: number;
  history: HistoryAction[];
  redo: () => void;
  canRedo: boolean;
  setActiveTool: (tool: DrawingTool | null) => void;
  activeTool: DrawingTool | null;
  drawingCanvasRef: React.RefObject<HTMLCanvasElement>;
  handleToolChange: (tool: DrawingTool) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  minBrushSize: number;
  maxBrushSize: number;
  showCropConfirm: boolean;
  setShowCropConfirm: (show: boolean) => void;
  showCurveConfirm: boolean;
  setShowCurveConfirm: (show: boolean) => void;
  showCurveArrowConfirm: boolean;
  setShowCurveArrowConfirm: (show: boolean) => void;
  flattenLayers: () => void;
  applyCrop: () => void;
  cropArea: null | {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  setCropArea: (
    area: null | {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ) => void;
  strokeStyle: StrokeStyle;
  setStrokeStyle: (style: StrokeStyle) => void;
}

const MobileView = ({
  undo,
  canUndo,
  historyStep,
  history,
  redo,
  canRedo,
  setActiveTool,
  activeTool,
  drawingCanvasRef,
  handleToolChange,
  currentColor,
  setCurrentColor,
  backgroundColor,
  setBackgroundColor,
  brushSize,
  setBrushSize,
  minBrushSize,
  maxBrushSize,
  showCropConfirm,
  setShowCropConfirm,
  showCurveConfirm,
  setShowCurveConfirm,
  showCurveArrowConfirm,
  setShowCurveArrowConfirm,
  flattenLayers,
  applyCrop,
  cropArea,
  setCropArea,
  strokeStyle,
  setStrokeStyle,
}: MobileViewProps) => {
  return (
    <div className="lg:hidden flex flex-col w-full items-center py-2 px-2 sm:p-4 gap-2 border-t relative z-50">
      {/* Tools Section (horizontally scrollable) */}
      <div className="w-full flex-shrink-0 flex flex-row gap-2 p-2 border rounded-md sm:mt-4 h-12 sm:h-auto items-center">
        {/* Changed border-b to border-t */}
        {/* Undo/Redo Buttons */}
        <div className="flex justify-center w-[20%] border-r">
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
            title="Undo"
            className="flex-1"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
            title="Redo"
            className="flex-1 mr-2"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="w-full flex-shrink-0 flex flex-row flex-1 gap-2 p-2 rounded-md overflow-x-auto whitespace-nowrap sm:mt-4 h-12 sm:h-auto items-center toolbar">
          <Button
            variant={activeTool === "line" ? "secondary" : "ghost"}
            onClick={() => handleToolChange("line")}
            className="flex flex-col px-2 py-1 gap-1 min-w-[40px] sm:min-w-[80px] h-max"
          >
            <MinusIcon className="h-4 w-4" />
            <span className="sr-only">Line</span>
          </Button>
          <Button
            variant={
              (activeTool as DrawingTool) === "text" ? "secondary" : "ghost"
            }
            onClick={() => handleToolChange("text")}
            className="flex flex-col px-2 py-1 gap-1 min-w-[40px] sm:min-w-[80px] h-max"
          >
            <Type className="h-4 w-4" />
            <span className="sr-only">Text</span>
          </Button>
          <Button
            variant={activeTool === "arrow" ? "secondary" : "ghost"}
            onClick={() => handleToolChange("arrow")}
            className="flex flex-col px-2 py-1 gap-1 min-w-[40px] sm:min-w-[80px] h-max"
          >
            <ArrowRight className="h-4 w-4" />
            <span className="sr-only">Arrow</span>
          </Button>
          <Button
            variant={activeTool === "double-arrow" ? "secondary" : "ghost"}
            onClick={() => handleToolChange("double-arrow")}
            className="flex flex-col px-2 py-1 gap-1 min-w-[40px] sm:min-w-[80px] h-max"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span className="sr-only">Double Arrow</span>
          </Button>
          <Button
            variant={activeTool === "curve" ? "secondary" : "ghost"}
            onClick={() => {
              const drawingCanvas = drawingCanvasRef.current;
              const ctx = drawingCanvas?.getContext("2d");
              if (!drawingCanvas || !ctx) return;
              const imageData = ctx.getImageData(
                0,
                0,
                drawingCanvas.width,
                drawingCanvas.height
              ).data;
              const hasChanges = imageData.some((pixel, index) => {
                return index % 4 === 3 && pixel !== 0;
              });
              if (hasChanges) {
                setShowCurveConfirm(true);
              } else {
                setActiveTool("curve");
              }
            }}
            className="flex flex-col px-2 py-1 gap-1 min-w-[40px] sm:min-w-[80px] h-max"
          >
            <PenTool className="h-4 w-4" />

            <span className="sr-only">Curve</span>
          </Button>
          <Button
            variant={activeTool === "curve-arrow" ? "secondary" : "ghost"}
            onClick={() => {
              const drawingCanvas = drawingCanvasRef.current;
              const ctx = drawingCanvas?.getContext("2d");
              if (!drawingCanvas || !ctx) return;
              const imageData = ctx.getImageData(
                0,
                0,
                drawingCanvas.width,
                drawingCanvas.height
              ).data;
              const hasChanges = imageData.some((pixel, index) => {
                return index % 4 === 3 && pixel !== 0;
              });
              if (hasChanges) {
                setShowCurveArrowConfirm(true);
              } else {
                setActiveTool("curve-arrow");
              }
            }}
            className="flex flex-col px-2 py-1 gap-1 min-w-[40px] sm:min-w-[80px] h-max"
          >
            <TbArrowCurveRight className="h-4 w-4" />
            <span className="sr-only">Curve Arrow</span>
          </Button>
          <Button
            variant={activeTool === "pencil" ? "secondary" : "ghost"}
            onClick={() => handleToolChange("pencil")}
            className="flex flex-col px-2 py-1 gap-1 min-w-[40px] sm:min-w-[80px] h-max"
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Pencil</span>
          </Button>
          <Button
            variant={activeTool === "eraser" ? "secondary" : "ghost"}
            onClick={() => handleToolChange("eraser")}
            className="flex flex-col px-2 py-1 gap-1 min-w-[40px] sm:min-w-[80px] h-max"
          >
            <Eraser className="h-4 w-4" />
            <span className="sr-only">Eraser</span>
          </Button>
          <Button
            variant={activeTool === "rectangle" ? "secondary" : "ghost"}
            onClick={() => handleToolChange("rectangle")}
            className="flex flex-col px-2 py-1 gap-1 min-w-[40px] sm:min-w-[80px] h-max"
          >
            <Square className="h-4 w-4" />
            <span className="sr-only">Rectangle</span>
          </Button>
          <Button
            variant={activeTool === "circle" ? "secondary" : "ghost"}
            onClick={() => handleToolChange("circle")}
            className="flex flex-col px-2 py-1 gap-1 min-w-[40px] sm:min-w-[80px] h-max"
          >
            <Circle className="h-4 w-4" />
            <span className="sr-only">Circle</span>
          </Button>
          <Button
            variant={activeTool === "crop" ? "secondary" : "ghost"}
            onClick={() => {
              const drawingCanvas = drawingCanvasRef.current;
              const ctx = drawingCanvas?.getContext("2d");
              if (!drawingCanvas || !ctx) return;
              const imageData = ctx.getImageData(
                0,
                0,
                drawingCanvas.width,
                drawingCanvas.height
              ).data;
              const hasChanges = imageData.some((pixel, index) => {
                return index % 4 === 3 && pixel !== 0;
              });
              if (hasChanges) {
                setShowCropConfirm(true);
              } else {
                handleToolChange("crop");
              }
            }}
            className="flex flex-col px-2 py-1 gap-1 min-w-[40px] sm:min-w-[80px] h-max"
          >
            <Crop className="h-4 w-4" />
            <span className="sr-only">Crop</span>
          </Button>
        </div>
      </div>
      {/* Color dropdown and brush size (below tools, in a horizontal row) */}
      <div className="flex flex-row gap-2 mt-1 sm:mt-4 w-full justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="color-picker-sm" className="flex items-center gap-2">
            {/* <Palette className="h-4 w-4" />  */}
            Color
          </Label>
          {/* <div className="rounded-full w-6 h-6"> */}
          <input
            type="color"
            id="color-picker-sm"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="rounded-full w-6 h-6"
          />
          {/* </div> */}
        </div>

        <div className="flex items-center gap-2">
          <Label
            htmlFor="background-color-picker-sm"
            className="flex items-center gap-2"
          >
            Bg
          </Label>
          <input
            type="color"
            id="background-color-picker-sm"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="rounded-full w-6 h-6"
          />
        </div>

        <div className="flex items-center gap-2 min-w-[12rem]">
          <Label htmlFor="brush-size-sm" className="block">
            Size: {brushSize}px
          </Label>
          <div className="flex items-center gap-1 sm:gap-2 min-w-[8rem]">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setBrushSize(Math.max(minBrushSize, brushSize - 1))
              }
              className="sm:h-8 sm:w-8 h-6 w-6"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Slider
              id="brush-size-sm"
              min={minBrushSize}
              max={maxBrushSize}
              step={1}
              value={[brushSize]}
              onValueChange={(value) => setBrushSize(value[0])}
              className="flex-grow"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setBrushSize(Math.min(maxBrushSize, brushSize + 1))
              }
              className="sm:h-8 sm:w-8 w-6 h-6"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {showCropConfirm && (
        <div className="flex flex-col gap-2 z-10 absolute top-0 left-0 right-0 bg-background px-4 py-2 overflow-y-auto">
          <p className="text-[12px] text-muted-foreground">
            These changes till now will be saved and they cannot be undone after
            cropping. You can make new changes after cropping the image.
          </p>
          <div className="flex sm:flex-col justify-around gap-2 flex-wrap">
            <Button
              type="button"
              onClick={() => {
                flattenLayers();
                setActiveTool("crop");
                setShowCropConfirm(false);
                toast({
                  title: "Changes Saved",
                  description:
                    "Previous changes have been saved. You can continue making new changes after cropping.",
                  duration: 3000,
                });
              }}
              className="!flex !flex-col !px-2 !py-1 !gap-1 !h-max"
            >
              Proceed
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCropConfirm(false)}
              className="!flex !flex-col !px-2 !py-1 !gap-1 !h-max"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showCurveConfirm && (
        <div className="flex flex-col gap-2 z-10 absolute top-0 left-0 right-0 bg-background px-4 py-2 overflow-y-auto">
          <p className="text-[12px] text-muted-foreground">
            These changes till now will be saved and they cannot be undone after
            cropping. You can make new changes after cropping the image.
          </p>
          <div className="flex sm:flex-col justify-around gap-2 flex-wrap">
            <Button
              type="button"
              onClick={() => {
                flattenLayers();
                setActiveTool("curve");
                setShowCurveConfirm(false);
                toast({
                  title: "Changes Saved",
                  description:
                    "Previous changes have been saved. You can continue making new changes after cropping.",
                  duration: 3000,
                });
              }}
              className="!flex !flex-col !px-2 !py-1 !gap-1 !h-max"
            >
              Proceed
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCurveConfirm(false)}
              className="!flex !flex-col !px-2 !py-1 !gap-1 !h-max"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showCurveArrowConfirm && (
        <div className="flex flex-col gap-2 z-10 absolute top-0 left-0 right-0 bg-background px-4 py-2 overflow-y-auto">
          <p className="text-[12px] text-muted-foreground">
            These changes till now will be saved and they cannot be undone after
            cropping. You can make new changes after cropping the image.
          </p>
          <div className="flex sm:flex-col justify-around gap-2 flex-wrap">
            <Button
              type="button"
              onClick={() => {
                flattenLayers();
                setActiveTool("curve-arrow");
                setShowCurveArrowConfirm(false);
                toast({
                  title: "Changes Saved",
                  description:
                    "Previous changes have been saved. You can continue making new changes after cropping.",
                  duration: 3000,
                });
              }}
              className="!flex !flex-col !px-2 !py-1 !gap-1 !h-max"
            >
              Proceed
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCurveArrowConfirm(false)}
              className="!flex !flex-col !px-2 !py-1 !gap-1 !h-max"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Tool-specific controls */}
      {activeTool === "crop" && (
        <div className="flex flex-col gap-2 z-10 absolute top-0 left-0 right-0 bg-background px-4 py-2 overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            Draw a rectangle to crop the image. Click "Save Changes" to apply
            the crop.
          </p>
          <div className="flex sm:flex-col justify-around gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => {
                setCropArea(null);
                setActiveTool(null);
                const ctx = drawingCanvasRef.current?.getContext("2d");
                if (ctx) {
                  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                }
              }}
              // disabled={!cropArea}
              className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={applyCrop}
              disabled={!cropArea}
              className="!flex !flex-col !px-2 !py-1 !gap-1 min-w-[45%] !h-max"
            >
              Apply
            </Button>
          </div>
        </div>
      )}

      {/* Show stroke style selector for shape tools */}
      {activeTool &&
        [
          "line",
          "rectangle",
          "circle",
          "arrow",
          "double-arrow",
          "curve",
        ].includes(activeTool) && (
          <div className="flex sm:flex-col sm:mt-4 justify-start">
            <Label
              htmlFor="stroke-style"
              className="flex items-center gap-2 mb-1"
            >
              <Grip className="h-4 w-4" /> Stroke Style
            </Label>
            <Select
              value={strokeStyle}
              onValueChange={(value: StrokeStyle) => setStrokeStyle(value)}
            >
              <SelectTrigger id="stroke-style">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">
                  <div className="flex items-center">
                    <MinusIcon className="w-4 h-4 mr-2" /> Solid
                  </div>
                </SelectItem>
                <SelectItem value="dashed">
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-2 flex items-center">
                      <div className="w-full border-t-2 border-dashed" />
                    </div>
                    Dashed
                  </div>
                </SelectItem>
                <SelectItem value="dotted">
                  <div className="flex items-center">
                    <DotIcon className="w-4 h-4 mr-2" /> Dotted
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
    </div>
  );
};

export default MobileView;
