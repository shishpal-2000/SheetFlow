"use client";

import { useEffect, useState, useCallback } from "react";

declare var cv: any;

interface PencilSketchOptions {
  kernelSize?: number; // For Gaussian blur (default: 81)
  intensity?: number; // For brightness adjustment (default: 256)
}

interface PencilSketchHookReturn {
  isOpenCVLoaded: boolean;
  applyPencilSketch: (
    canvas: HTMLCanvasElement,
    options?: PencilSketchOptions
  ) => Promise<boolean>;
  loadOpenCV: () => Promise<boolean>;
}

// ✅ Custom hook for pencil sketch functionality
export const usePencilSketch = (): PencilSketchHookReturn => {
  const [isOpenCVLoaded, setIsOpenCVLoaded] = useState(false);

  useEffect(() => {
    if (typeof cv !== "undefined" && cv.Mat) {
      setIsOpenCVLoaded(true);
    }
  }, []);

  // Load OpenCV.js
  const loadOpenCV = useCallback((): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      // Check if OpenCV is already loaded
      if (typeof cv !== "undefined" && cv.Mat) {
        setIsOpenCVLoaded(true);
        resolve(true);
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="opencv.js"]');
      if (existingScript) {
        const checkLoaded = () => {
          if (typeof cv !== "undefined" && cv.Mat) {
            setIsOpenCVLoaded(true);
            resolve(true);
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      // Load OpenCV.js dynamically
      const script = document.createElement("script");
      script.src = "https://docs.opencv.org/master/opencv.js";
      script.async = true;
      script.id = "opencv-script";

      script.onload = () => {
        if (cv && cv.onRuntimeInitialized) {
          cv.onRuntimeInitialized = () => {
            console.log("OpenCV.js loaded successfully");
            setIsOpenCVLoaded(true);
            resolve(true);
          };
        } else if (cv && cv.Mat) {
          // OpenCV already initialized
          setIsOpenCVLoaded(true);
          resolve(true);
        }
      };

      script.onerror = () => {
        console.error("Failed to load OpenCV.js");
        reject(new Error("Failed to load OpenCV.js"));
      };

      document.body.appendChild(script);
    });
  }, []);

  // Apply pencil sketch effect to canvas
  const applyPencilSketch = useCallback(
    async (
      canvas: HTMLCanvasElement,
      options: PencilSketchOptions = {}
    ): Promise<boolean> => {
      const { kernelSize = 21, intensity = 256 } = options;

      if (!isOpenCVLoaded || typeof cv === "undefined" || !cv.Mat) {
        console.error("OpenCV.js not loaded yet");
        return false;
      }

      try {
        // Read image from canvas
        const src = cv.imread(canvas);

        // Convert to grayscale
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 50);

        // Invert the grayscale image
        const inverted = new cv.Mat();
        cv.bitwise_not(gray, inverted);

        // Apply Gaussian blur to the inverted image
        const blurred = new cv.Mat();
        const ksize = new cv.Size(kernelSize, kernelSize);
        cv.GaussianBlur(inverted, blurred, ksize, 0, 0, cv.BORDER_DEFAULT);

        // Create white background
        const whiteMat = new cv.Mat(
          gray.rows,
          gray.cols,
          gray.type(),
          new cv.Scalar(255)
        );

        // Subtract blurred from white background
        const subtractResult = new cv.Mat();
        cv.subtract(whiteMat, blurred, subtractResult);

        // Divide original gray by the subtract result to create pencil effect
        const blend = new cv.Mat();
        cv.divide(gray, subtractResult, blend, intensity);

        // Convert back to RGBA for canvas compatibility
        // const result = new cv.Mat();
        // cv.cvtColor(blend, result, cv.COLOR_GRAY2RGBA);

        const edges = new cv.Mat();
        cv.Canny(gray, edges, 300, 350);

        // Combine sketch with edges for better definition
        const result = new cv.Mat();
        cv.bitwise_or(blend, edges, result);

        // Ensure white background with dark lines
        const final = new cv.Mat();
        result.convertTo(final, cv.CV_8UC1, 0.8, 10);

        // Apply result back to canvas
        cv.imshow(canvas, final);

        // Free memory
        src.delete();
        gray.delete();
        inverted.delete();
        blurred.delete();
        whiteMat.delete();
        subtractResult.delete();
        blend.delete();
        edges.delete();
        result.delete();
        final.delete();

        return true;
      } catch (error) {
        console.error("Error in pencil sketch processing:", error);
        return false;
      }
    },
    [isOpenCVLoaded]
  );

  return {
    isOpenCVLoaded,
    applyPencilSketch,
    loadOpenCV,
  };
};
