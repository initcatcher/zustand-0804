import { useCallback, useRef, useState } from "react";
import Konva from "konva";

export interface VideoTransformState {
  isSelected: boolean;
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
}

export interface VideoTransformActions {
  selectVideo: () => void;
  deselectVideo: () => void;
  updateTransform: (attrs: Partial<VideoTransformState>) => void;
  attachTransformer: (imageNode: Konva.Image) => void;
  detachTransformer: () => void;
}

const initialState: VideoTransformState = {
  isSelected: false,
  position: { x: 0, y: 0 },
  scale: { x: 1, y: 1 },
  rotation: 0,
};

export const useVideoTransform = () => {
  const [state, setState] = useState<VideoTransformState>(initialState);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const imageNodeRef = useRef<Konva.Image | null>(null);

  const selectVideo = useCallback(() => {
    setState(prev => ({ ...prev, isSelected: true }));
    if (transformerRef.current && imageNodeRef.current) {
      transformerRef.current.nodes([imageNodeRef.current]);
    }
  }, []);

  const deselectVideo = useCallback(() => {
    setState(prev => ({ ...prev, isSelected: false }));
    if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, []);

  const updateTransform = useCallback((attrs: Partial<VideoTransformState>) => {
    setState(prev => ({ ...prev, ...attrs }));
  }, []);

  const attachTransformer = useCallback((imageNode: Konva.Image) => {
    imageNodeRef.current = imageNode;
    if (state.isSelected && transformerRef.current) {
      transformerRef.current.nodes([imageNode]);
    }
  }, [state.isSelected]);

  const detachTransformer = useCallback(() => {
    imageNodeRef.current = null;
    if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, []);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
    const node = e.target as Konva.Image;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    updateTransform({
      position: { x: node.x(), y: node.y() },
      scale: { x: scaleX, y: scaleY },
      rotation: node.rotation(),
    });
  }, [updateTransform]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target as Konva.Image;
    updateTransform({
      position: { x: node.x(), y: node.y() },
    });
  }, [updateTransform]);

  return {
    state,
    actions: {
      selectVideo,
      deselectVideo,
      updateTransform,
      attachTransformer,
      detachTransformer,
    },
    handlers: {
      handleTransformEnd,
      handleDragEnd,
    },
    refs: {
      transformerRef,
      imageNodeRef,
    },
  };
};