import {
  KonvaArrow,
  KonvaArrowHandle,
} from "@/components/image-editor/ArrowKonva";
import {
  KonvaCircleHandle,
  KonvaCircleShape,
} from "@/components/image-editor/KonvaCircle";
import {
  KonvaDoubleArrowHandle,
  KonvaDoubleArrowShape,
} from "@/components/image-editor/KonvaDoubleArrow";
import {
  KonvaRectangle,
  KonvaRectangleHandle,
} from "@/components/image-editor/KonvaRectangle";
import {
  KonvaTextShape,
  TextEditorHandle,
} from "@/components/image-editor/TextEditor";
import {
  BaseCanvasAction,
  DrawingAction,
  HistoryAction,
  HistoryState,
  KonvaAction,
} from "@/types/history";
import { CanvasReplayManager } from "@/utils/canvasReplay";
import { useCallback, useRef, useState } from "react";

interface useHistoryManagerProps {
  drawingCanvasRef: React.RefObject<HTMLCanvasElement>;
  baseCanvasRef: React.RefObject<HTMLCanvasElement>;
}

export const useHistoryManager = ({
  drawingCanvasRef,
  baseCanvasRef,
}: useHistoryManagerProps) => {
  const [historyState, setHistoryState] = useState<HistoryState>({
    actions: [],
    currentStep: -1,
    redoStack: [],
  });

  const [rectangles, setRectangles] = useState<KonvaRectangle[]>([]);
  const [circles, setCircles] = useState<KonvaCircleShape[]>([]);
  const [arrows, setArrows] = useState<KonvaArrow[]>([]);
  const [doubleArrows, setDoubleArrows] = useState<KonvaDoubleArrowShape[]>([]);
  const [texts, setTexts] = useState<KonvaTextShape[]>([]);

  const konvaRectRef = useRef<KonvaRectangleHandle>(null);
  const konvaCircleRef = useRef<KonvaCircleHandle>(null);
  const konvaArrowRef = useRef<KonvaArrowHandle>(null);
  const konvaDoubleArrowRef = useRef<KonvaDoubleArrowHandle>(null);
  const textEditorRef = useRef<TextEditorHandle>(null);

  const replayManager = useRef<CanvasReplayManager | null>(null);

  // Initialize replay manager
  if (
    !replayManager.current &&
    drawingCanvasRef.current &&
    baseCanvasRef.current
  ) {
    replayManager.current = new CanvasReplayManager(
      drawingCanvasRef,
      baseCanvasRef
    );
  }

  // Action creator
  const createAction = useCallback(
    (
      target: HistoryAction["target"],
      type: string,
      payload: any
    ): HistoryAction =>
      ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        target,
        type,
        payload,
      } as HistoryAction),
    []
  );

  // Add action to history
  const addAction = useCallback(
    (action: HistoryAction) => {
      setHistoryState((prevState) => {
        // Remove any actions after current step (when undoing and then doing new action)
        const newActions = prevState.actions.slice(
          0,
          prevState.currentStep + 1
        );
        newActions.push(action);

        // For drawing actions, trigger replay immediately with the new actions
        if (action.target === "drawing" && replayManager.current) {
          // Small delay to ensure canvas is ready
          setTimeout(() => {
            if (replayManager.current) {
              const drawingActions = newActions.filter(
                (a) => a.target === "drawing"
              ) as DrawingAction[];
              replayManager.current.clearDrawingCanvas();
              drawingActions.forEach((drawingAction) => {
                replayManager.current!.applyDrawingAction(drawingAction);
              });
            }
          }, 0);
        }

        return {
          actions: newActions,
          currentStep: newActions.length - 1,
          redoStack: [], // Clear redo stack when new action is added
        };
      });
    },
    [replayManager]
  );

  const undo = useCallback(() => {
    if (historyState.currentStep < 0) return;

    const actionToUndo = historyState.actions[historyState.currentStep];

    setHistoryState((prevState) => ({
      actions: prevState.actions,
      currentStep: prevState.currentStep - 1,
      redoStack: [actionToUndo, ...prevState.redoStack],
    }));

    console.log("Undoing action:", actionToUndo.type, actionToUndo.payload);

    switch (actionToUndo.target) {
      case "drawing":
        // For drawing actions, we need to replay all remaining drawing actions
        if (replayManager.current) {
          const remainingDrawingActions = historyState.actions
            .slice(0, historyState.currentStep)
            .filter((action) => action.target === "drawing") as DrawingAction[];

          replayManager.current.clearDrawingCanvas();
          remainingDrawingActions.forEach((action) => {
            replayManager.current!.applyDrawingAction(action);
          });
        }
        break;
      case "base":
        // Handle base canvas actions - filter undo
        if (actionToUndo.type === "APPLY_FILTER" && replayManager.current) {
          const baseAction = actionToUndo as BaseCanvasAction;
          if (baseAction.payload.previousImageData) {
            replayManager.current.undoBaseAction(baseAction);
          }
        }
        break;
      case "konva":
        const konvaAction = actionToUndo as KonvaAction;
        switch (konvaAction.type) {
          case "ADD_RECTANGLE":
            setRectangles((prev) =>
              prev.filter((r) => r.id !== konvaAction.payload.elementId)
            );
            break;
          case "ADD_CIRCLE":
            setCircles((prev) =>
              prev.filter((c) => c.id !== konvaAction.payload.elementId)
            );
            break;
          case "ADD_ARROW":
            setArrows((prev) =>
              prev.filter((a) => a.id !== konvaAction.payload.elementId)
            );
            break;
          case "ADD_DOUBLE_ARROW":
            setDoubleArrows((prev) =>
              prev.filter((a) => a.id !== konvaAction.payload.elementId)
            );
            break;
          case "ADD_TEXT":
            setTexts((prev) =>
              prev.filter((t) => t.id !== konvaAction.payload.elementId)
            );
            break;
          case "MOVE_ELEMENT":
            if (konvaAction.payload.previousData) {
              switch (konvaAction.payload.elementType) {
                case "rectangle":
                  setRectangles((prev) =>
                    prev.map((r) =>
                      r.id === konvaAction.payload.elementId
                        ? konvaAction.payload.previousData
                        : r
                    )
                  );
                  break;
                case "circle":
                  setCircles((prev) =>
                    prev.map((c) =>
                      c.id === konvaAction.payload.elementId
                        ? konvaAction.payload.previousData
                        : c
                    )
                  );
                  break;
                case "arrow":
                  setArrows((prev) =>
                    prev.map((a) =>
                      a.id === konvaAction.payload.elementId
                        ? konvaAction.payload.previousData
                        : a
                    )
                  );
                  break;
                case "double-arrow":
                  setDoubleArrows((prev) =>
                    prev.map((d) =>
                      d.id === konvaAction.payload.elementId
                        ? konvaAction.payload.previousData
                        : d
                    )
                  );
                  break;
                case "text":
                  setTexts((prev) =>
                    prev.map((t) =>
                      t.id === konvaAction.payload.elementId
                        ? konvaAction.payload.previousData
                        : t
                    )
                  );
                  break;
              }
            }
            break;
        }
        break;
    }
  }, [
    historyState.actions,
    historyState.currentStep,
    replayManager,
    setRectangles,
    setCircles,
    setArrows,
    setDoubleArrows,
    setTexts,
  ]);

  // Redo functionality
  const redo = useCallback(() => {
    if (historyState.redoStack.length === 0) return;

    const actionToRedo = historyState.redoStack[0];

    setHistoryState((prevState) => ({
      actions: prevState.actions,
      currentStep: prevState.currentStep + 1,
      redoStack: prevState.redoStack.slice(1),
    }));

    switch (actionToRedo.target) {
      case "drawing":
        if (replayManager.current) {
          replayManager.current.applyDrawingAction(
            actionToRedo as DrawingAction
          );
        }
        break;
      case "base":
        // Handle base canvas actions - filter redo
        if (actionToRedo.type === "APPLY_FILTER" && replayManager.current) {
          const baseAction = actionToRedo as BaseCanvasAction;
          replayManager.current.applyBaseAction(baseAction);
        }
        break;
      case "konva":
        const konvaAction = actionToRedo as KonvaAction;
        switch (konvaAction.type) {
          case "ADD_RECTANGLE":
            setRectangles((prev) => [...prev, konvaAction.payload.data]);
            break;
          case "ADD_CIRCLE":
            setCircles((prev) => [...prev, konvaAction.payload.data]);
            break;
          case "ADD_ARROW":
            setArrows((prev) => [...prev, konvaAction.payload.data]);
            break;
          case "ADD_DOUBLE_ARROW":
            setDoubleArrows((prev) => [...prev, konvaAction.payload.data]);
            break;
          case "ADD_TEXT":
            setTexts((prev) => [...prev, konvaAction.payload.data]);
            break;
          case "MOVE_ELEMENT":
            // For redo move actions, apply the new state
            switch (konvaAction.payload.elementType) {
              case "rectangle":
                setRectangles((prev) =>
                  prev.map((r) =>
                    r.id === konvaAction.payload.elementId
                      ? konvaAction.payload.data
                      : r
                  )
                );
                break;
              case "circle":
                setCircles((prev) =>
                  prev.map((c) =>
                    c.id === konvaAction.payload.elementId
                      ? konvaAction.payload.data
                      : c
                  )
                );
                break;
              case "arrow":
                setArrows((prev) =>
                  prev.map((a) =>
                    a.id === konvaAction.payload.elementId
                      ? konvaAction.payload.data
                      : a
                  )
                );
                break;
              case "double-arrow":
                setDoubleArrows((prev) =>
                  prev.map((d) =>
                    d.id === konvaAction.payload.elementId
                      ? konvaAction.payload.data
                      : d
                  )
                );
                break;
              case "text":
                setTexts((prev) =>
                  prev.map((t) =>
                    t.id === konvaAction.payload.elementId
                      ? konvaAction.payload.data
                      : t
                  )
                );
                break;
            }
            break;
        }
        break;
    }
  }, [
    historyState.redoStack,
    replayManager,
    setRectangles,
    setCircles,
    setArrows,
    setDoubleArrows,
    setTexts,
  ]);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistoryState({
      actions: [],
      currentStep: -1,
      redoStack: [],
    });
  }, []);

  // Get current state info
  const canUndo = historyState.currentStep >= 0;
  const canRedo = historyState.redoStack.length > 0;
  const actionCount = historyState.actions.length;

  return {
    // State
    historyState,
    canUndo,
    canRedo,
    actionCount,

    // Actions
    addAction,
    createAction,
    undo,
    redo,
    clearHistory,

    // konva states
    rectangles,
    setRectangles,
    circles,
    setCircles,
    arrows,
    setArrows,
    doubleArrows,
    setDoubleArrows,
    texts,
    setTexts,

    // konva refs
    konvaRectRef,
    konvaCircleRef,
    konvaArrowRef,
    konvaDoubleArrowRef,
    textEditorRef,

    // Utils
    replayManager,
  };
};
