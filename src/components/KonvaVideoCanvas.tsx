import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image, Transformer } from "react-konva";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import Konva from "konva";
import { useVideoTransform } from "../hooks/useVideoTransform";

interface KonvaVideoCanvasProps {
  trackRef: TrackReferenceOrPlaceholder;
  quality?: "high" | "good" | "low";
  width?: number;
  height?: number;
  enableMaskFilter?: boolean;
}

const INTERVALS = {
  high: 1000 / 60,   // 60fps
  good: 1000 / 30,   // 30fps
  low: 1000 / 15,    // 15fps
};

export const KonvaVideoCanvas: React.FC<KonvaVideoCanvasProps> = ({
  trackRef,
  quality = "good",
  width = 640,
  height = 480,
  enableMaskFilter = true,
}) => {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null
  );
  const [processedCanvas, setProcessedCanvas] =
    useState<HTMLCanvasElement | null>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const imageRef = useRef<Konva.Image>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  // Use ref for filter setting to avoid animation loop restarts
  const enableMaskFilterRef = useRef(enableMaskFilter);

  const {
    state: transformState,
    actions: { selectVideo, deselectVideo, attachTransformer },
    handlers: { handleTransformEnd, handleDragEnd },
    refs: { transformerRef },
  } = useVideoTransform();

  useEffect(() => {
    // Check if this is a placeholder
    if (!trackRef.publication) return;

    const publication = trackRef.publication;
    if (!publication.videoTrack) return;

    const track = publication.videoTrack;
    const element = track.attach() as HTMLVideoElement;

    // Hide the actual video element
    element.style.display = "none";
    document.body.appendChild(element);

    setVideoElement(element);

    return () => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
      track.detach();
    };
  }, [trackRef]);

  // Real-time chroma key processing
  const processVideoFrame = () => {
    if (
      !offscreenCtxRef.current ||
      !offscreenCanvasRef.current ||
      !videoElement
    )
      return;

    const ctx = offscreenCtxRef.current;
    const canvas = offscreenCanvasRef.current;

    // Draw current video frame to offscreen canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    if (enableMaskFilterRef.current) {
      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Fixed background color: RGB(0, 255, 1)
      const targetColor = { r: 0, g: 255, b: 1 };

      // Process each pixel
      for (let i = 0; i < data.length; i += 4) {
        const currentColor = {
          r: data[i],
          g: data[i + 1],
          b: data[i + 2],
        };

        // Calculate color distance from target green screen color
        const distance = Math.sqrt(
          Math.pow(currentColor.r - targetColor.r, 2) +
            Math.pow(currentColor.g - targetColor.g, 2) +
            Math.pow(currentColor.b - targetColor.b, 2)
        );

        // Remove pixels similar to RGB(0,255,1) with fixed threshold
        if (distance < 30) {
          data[i + 3] = 0; // Fully transparent
        }
        // else if (distance < maskThreshold * 1.6) {
        //   // Gradual transparency in boundary area
        //   const factor = (distance - maskThreshold * 0.6) / (maskThreshold * 1.0);
        //   data[i + 3] = Math.round(255 * factor);
        // }
      }

      // Put processed data back
      ctx.putImageData(imageData, 0, 0);
    }
  };

  // Integrated video processing and rendering loop
  useEffect(() => {
    if (!layerRef.current || !videoElement || !processedCanvas) return;

    const interval = setInterval(() => {
      // Process video frame at the same rate as rendering
      processVideoFrame();
      
      // Render to screen
      layerRef.current?.batchDraw();
    }, INTERVALS[quality]);

    return () => clearInterval(interval);
  }, [quality, videoElement, processedCanvas]);
  
  // Update ref when prop changes (without restarting loops)
  useEffect(() => {
    enableMaskFilterRef.current = enableMaskFilter;
  }, [enableMaskFilter]);

  // Handle stage click for selection/deselection
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // If clicked on empty area, deselect
    if (e.target === e.target.getStage()) {
      deselectVideo();
      return;
    }

    // If clicked on image, select
    if (e.target === imageRef.current) {
      selectVideo();
    }
  };

  // Setup transformer when image is ready
  useEffect(() => {
    if (imageRef.current && transformState.isSelected) {
      attachTransformer(imageRef.current);
    }
  }, [transformState.isSelected, attachTransformer]);

  // Setup offscreen canvas for video processing
  useEffect(() => {
    if (!videoElement) return;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      offscreenCanvasRef.current = canvas;
      offscreenCtxRef.current = ctx;
      setProcessedCanvas(canvas);
    }
  }, [videoElement, width, height]);

  return (
    <Stage width={width} height={height} onMouseDown={handleStageClick}>
      <Layer ref={layerRef}>
        {processedCanvas && (
          <Image
            ref={imageRef}
            image={processedCanvas}
            x={transformState.position.x}
            y={transformState.position.y}
            scaleX={transformState.scale.x}
            scaleY={transformState.scale.y}
            rotation={transformState.rotation}
            width={width}
            height={height}
            draggable
            onDragEnd={handleDragEnd}
            onTransformEnd={handleTransformEnd}
            onClick={selectVideo}
            // Real-time chroma key processing applied via offscreen canvas
          />
        )}
        {transformState.isSelected && (
          <Transformer
            ref={transformerRef}
            flipEnabled={false}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit minimum size
              if (Math.abs(newBox.width) < 50 || Math.abs(newBox.height) < 50) {
                return oldBox;
              }
              return newBox;
            }}
          />
        )}
      </Layer>
    </Stage>
  );
};
