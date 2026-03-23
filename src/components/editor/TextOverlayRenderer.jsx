import React, { useCallback, useRef, useState } from "react";
import { getTexts } from "./timelineHelpers";

/**
 * TEXT OVERLAY RENDERER — Canvas-based text rendering with drag support
 * 
 * Renders text overlays on the video preview canvas.
 * Allows clicking and dragging text to reposition.
 * Updates timeline state via onTextMove callback.
 */
export function TextOverlayRenderer({
  timeline,
  canvasRef,
  videoDims = { w: 640, h: 360 },
  isPlaying = false,
  currentTime = 0,
  selectedTextId = null,
  onSelectText = () => {},
  onTextMove = () => {},
}) {
  const texts = getTexts(timeline);
  const dragRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Draw text overlays on canvas
  const drawTextOverlays = useCallback((ctx) => {
    if (!ctx || !Array.isArray(texts)) return;

    texts.forEach((text) => {
      const { content, x, y, fontSize = 24, color = "#ffffff", startTime = 0, duration = 5, id } = text;
      
      // Only draw if text is active in timeline
      if (currentTime < startTime || currentTime > startTime + duration) return;

      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Convert normalized coordinates (0-100) to canvas pixels
      const pixelX = (x / 100) * videoDims.w;
      const pixelY = (y / 100) * videoDims.h;

      // Draw text with slight shadow for readability
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(content, pixelX, pixelY);
      ctx.shadowColor = "transparent";

      // Draw bounding box if selected
      if (id === selectedTextId && !isPlaying) {
        const metrics = ctx.measureText(content);
        const w = metrics.width + 8;
        const h = fontSize + 8;
        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 2;
        ctx.strokeRect(pixelX - w / 2, pixelY - h / 2, w, h);
      }
    });
  }, [texts, currentTime, videoDims, selectedTextId, isPlaying]);

  // Find text at click position
  const getTextAtPos = useCallback((clientX, clientY) => {
    if (!canvasRef.current) return null;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    const normX = (relX / rect.width) * 100;
    const normY = (relY / rect.height) * 100;

    // Check if within 30px of any text
    return texts.find((text) => {
      const { startTime = 0, duration = 5 } = text;
      if (currentTime < startTime || currentTime > startTime + duration) return false;
      
      const distance = Math.sqrt(Math.pow(normX - (text.x || 50), 2) + Math.pow(normY - (text.y || 50), 2));
      return distance < 5; // 5% tolerance
    }) || null;
  }, [texts, currentTime]);

  const handleCanvasMouseDown = useCallback((e) => {
    if (isPlaying) return;
    const text = getTextAtPos(e.clientX, e.clientY);
    if (text) {
      dragRef.current = text.id;
      setIsDragging(true);
      onSelectText(text.id);
    }
  }, [isPlaying, getTextAtPos, onSelectText]);

  const handleCanvasMouseMove = useCallback((e) => {
    if (!isDragging || !dragRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const normX = Math.max(0, Math.min(100, (relX / rect.width) * 100));
    const normY = Math.max(0, Math.min(100, (relY / rect.height) * 100));

    onTextMove(dragRef.current, normX, normY);
  }, [isDragging, canvasRef, onTextMove]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  // Attach event listeners
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("mousedown", handleCanvasMouseDown);
    document.addEventListener("mousemove", handleCanvasMouseMove);
    document.addEventListener("mouseup", handleCanvasMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleCanvasMouseDown);
      document.removeEventListener("mousemove", handleCanvasMouseMove);
      document.removeEventListener("mouseup", handleCanvasMouseUp);
    };
  }, [handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp, canvasRef]);

  return { drawTextOverlays };
}
