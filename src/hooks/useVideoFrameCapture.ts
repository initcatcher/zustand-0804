import { useCallback, useEffect, useRef } from 'react';

export interface UseVideoFrameCaptureOptions {
  quality: 'high' | 'good' | 'low';
  onFrame: (videoElement: HTMLVideoElement) => void;
  enabled: boolean;
}

const QUALITY_FPS = {
  high: 50,
  good: 30,
  low: 15,
};

export const useVideoFrameCapture = (options: UseVideoFrameCaptureOptions) => {
  const { quality, onFrame, enabled } = options;
  const animationRef = useRef<number | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  
  const targetFPS = QUALITY_FPS[quality];
  const frameInterval = 1000 / targetFPS;
  const lastFrameTimeRef = useRef<number>(0);

  const captureFrame = useCallback((timestamp: number) => {
    if (!enabled || !videoElementRef.current) {
      animationRef.current = requestAnimationFrame(captureFrame);
      return;
    }

    const deltaTime = timestamp - lastFrameTimeRef.current;
    
    if (deltaTime >= frameInterval) {
      const videoElement = videoElementRef.current;
      
      // Check if video is ready
      if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0 && !videoElement.paused) {
        onFrame(videoElement);
      }
      
      lastFrameTimeRef.current = timestamp;
    }
    
    animationRef.current = requestAnimationFrame(captureFrame);
  }, [enabled, frameInterval, onFrame]);

  const startCapture = useCallback((videoElement: HTMLVideoElement) => {
    videoElementRef.current = videoElement;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (enabled) {
      animationRef.current = requestAnimationFrame(captureFrame);
    }
  }, [enabled, captureFrame]);

  const stopCapture = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    videoElementRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Restart capture when quality changes
  useEffect(() => {
    if (videoElementRef.current && enabled) {
      startCapture(videoElementRef.current);
    }
  }, [quality, enabled, startCapture]);

  return {
    startCapture,
    stopCapture,
  };
};