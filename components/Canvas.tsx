
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Tool, Point, DrawingAction, BrushSettings, Layer, RulerState, GridSettings } from '../types';

interface CanvasProps {
  tool: Tool;
  color: string;
  settings: BrushSettings;
  layers: Layer[];
  activeLayerId: string | null;
  history: DrawingAction[];
  onActionComplete: (action: DrawingAction) => void;
  width: number;
  height: number;
  backgroundColor: string;
  gridSettings: GridSettings;
  onCapture?: (dataUrl: string) => void;
}

export interface CanvasHandle {
  getDataUrl: () => string;
  clearSelection: () => void;
  resetView: () => void;
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(({ tool, color, settings, layers, activeLayerId, history, onActionComplete, width, height, backgroundColor, gridSettings, onCapture }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [lassoPoints, setLassoPoints] = useState<Point[] | null>(null);
  const [tempShape, setTempShape] = useState<Point[] | null>(null);

  // Ruler State
  const [ruler, setRuler] = useState<RulerState>({
    isActive: false,
    x: width / 2,
    y: height / 2,
    angle: 0,
    length: 800,
    isDragging: false,
    isRotating: false
  });

  const currentPathRef = useRef<Point[]>([]);
  const lastPointRef = useRef<Point | null>(null);
  const stabilizedPointRef = useRef<Point | null>(null);
  const lastPanPosRef = useRef<Point | null>(null);
  
  const brushTipCache = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const generateProceduralTip = (ctx: CanvasRenderingContext2D, center: number, radius: number, hardness: number, shape: string, color: string) => {
    if (shape === 'textured') {
      for (let i = 0; i < radius * radius * 0.8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.pow(Math.random(), hardness > 0 ? 0.5 / hardness : 2) * radius;
        const x = center + Math.cos(angle) * dist;
        const y = center + Math.sin(angle) * dist;
        ctx.globalAlpha = Math.random() * 0.5;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1.2, 1.2);
      }
    } else if (shape === 'chisel') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(center, center, radius, radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape === 'square') {
      ctx.fillStyle = color;
      ctx.fillRect(center - radius, center - radius, radius * 2, radius * 2);
    }
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getBrushTip = (color: string, size: number, hardness: number, shape: string, tipData?: string): HTMLCanvasElement => {
    const key = `${color}-${Math.round(size)}-${hardness.toFixed(2)}-${shape}-${tipData || 'none'}`;
    if (brushTipCache.current.has(key)) {
      return brushTipCache.current.get(key)!;
    }

    const tipCanvas = document.createElement('canvas');
    const padding = 4;
    const canvasSize = Math.max(1, Math.ceil(size) + padding);
    tipCanvas.width = canvasSize;
    tipCanvas.height = canvasSize;
    const ctx = tipCanvas.getContext('2d')!;
    const center = canvasSize / 2;
    const radius = size / 2;

    if (shape === 'custom' && tipData) {
      const img = new Image();
      img.src = tipData;
      if (img.complete) {
        ctx.drawImage(img, padding/2, padding/2, size, size);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvasSize, canvasSize);
      }
    } else if (shape === 'round') {
      if (hardness >= 0.98) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const gradient = ctx.createRadialGradient(center, center, radius * hardness, center, center, radius);
        gradient.addColorStop(0, color);
        const rgba = color.startsWith('#') ? hexToRgba(color, 0) : color.replace('rgb', 'rgba').replace(')', ', 0)');
        gradient.addColorStop(1, rgba);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      generateProceduralTip(ctx, center, radius, hardness, shape, color);
    }

    brushTipCache.current.set(key, tipCanvas);
    if (brushTipCache.current.size > 150) {
      const firstKey = brushTipCache.current.keys().next().value;
      if (firstKey) brushTipCache.current.delete(firstKey);
    }
    
    return tipCanvas;
  };

  const getFadeEase = (t: number, shape: number) => {
    const nt = Math.max(0, Math.min(1, t));
    if (shape < 0.5) {
      const weight = shape * 2;
      const sine = 0.5 - 0.5 * Math.cos(nt * Math.PI);
      return sine * (1 - weight) + nt * weight;
    } else {
      const weight = (shape - 0.5) * 2;
      const pointed = Math.pow(nt, 2.5);
      return nt * (1 - weight) + pointed * weight;
    }
  };

  const renderAction = useCallback((ctx: CanvasRenderingContext2D, action: Omit<DrawingAction, 'id' | 'layerId'>) => {
    if (action.points.length < 1) return;
    
    ctx.save();
    ctx.globalCompositeOperation = action.tool === 'eraser' ? 'destination-out' : 'source-over';

    const { 
      size, hardness, flow, shape, brushTipData, 
      thicknessStart = 1, thicknessEnd = 1, 
      opacityStart = 1, opacityEnd = 1,
      fadeLengthStart = 0.2, fadeLengthEnd = 0.2, fadeShape = 0.5,
      pressureSize = true, pressureOpacity = true, pressureCurve = 1.0,
      jitter = 0, angleJitter = 0, sizeJitter = 0, opacityJitter = 0,
      rotation = 0, angleFollow = false
    } = action.settings;

    if (['line', 'rect', 'circle', 'measure'].includes(action.tool)) {
      ctx.strokeStyle = action.color;
      ctx.lineWidth = size;
      ctx.globalAlpha = flow;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      if (action.tool === 'line' || action.tool === 'measure') {
        ctx.moveTo(action.points[0].x, action.points[0].y);
        ctx.lineTo(action.points[action.points.length - 1].x, action.points[action.points.length - 1].y);
      } else if (action.tool === 'rect') {
        ctx.moveTo(action.points[0].x, action.points[0].y);
        action.points.forEach(p => ctx.lineTo(p.x, p.y));
      } else if (action.tool === 'circle') {
        ctx.moveTo(action.points[0].x, action.points[0].y);
        action.points.forEach(p => ctx.lineTo(p.x, p.y));
      }
      ctx.stroke();
      
      if (action.tool === 'measure' && action.points.length >= 2) {
        const p1 = action.points[0];
        const p2 = action.points[action.points.length - 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        ctx.save();
        ctx.translate((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        ctx.rotate(angle);
        ctx.fillStyle = action.color;
        ctx.font = `${Math.max(12, size * 2)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(dist)}px`, 0, -5);
        ctx.restore();
      }
      
      ctx.restore();
      return;
    }
    
    const baseSpacing = action.settings.spacing || 0.05;
    const totalPoints = action.points.length;

    action.points.forEach((p, i) => {
      const progress = totalPoints > 1 ? i / (totalPoints - 1) : 0;
      let taperSizeMult = 1.0;
      let taperAlphaMult = 1.0;

      if (progress < fadeLengthStart && fadeLengthStart > 0) {
        const t = getFadeEase(progress / fadeLengthStart, fadeShape);
        taperSizeMult = thicknessStart + (1.0 - thicknessStart) * t;
        taperAlphaMult = opacityStart + (1.0 - opacityStart) * t;
      } 
      else if (progress > (1.0 - fadeLengthEnd) && fadeLengthEnd > 0) {
        const normalizedEndProgress = (progress - (1.0 - fadeLengthEnd)) / fadeLengthEnd;
        const t = getFadeEase(1.0 - normalizedEndProgress, fadeShape);
        taperSizeMult = thicknessEnd + (1.0 - thicknessEnd) * t;
        taperAlphaMult = opacityEnd + (1.0 - opacityEnd) * t;
      }

      let pressureValue = p.pressure ?? 1.0;
      if (pressureValue > 0) {
        pressureValue = Math.pow(pressureValue, 1 / pressureCurve);
      }

      const prev = action.points[i-1] || p;
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const angle = Math.atan2(dy, dx);
      
      const spacing = Math.max(0.5, size * baseSpacing);
      const steps = Math.ceil(dist / spacing);
      
      for(let s = 0; s <= steps; s++) {
        const tStep = s / (steps || 1);
        let tx = prev.x + dx * tStep;
        let ty = prev.y + dy * tStep;
        
        if (jitter > 0) {
          tx += (Math.random() - 0.5) * jitter * size;
          ty += (Math.random() - 0.5) * jitter * size;
        }

        let currentSize = Math.max(0.1, size * taperSizeMult * (pressureSize ? pressureValue : 1.0));
        if (sizeJitter > 0) currentSize *= (1 - sizeJitter + Math.random() * sizeJitter);
        
        let currentFlow = Math.max(0, flow * taperAlphaMult * (pressureOpacity ? pressureValue : 1.0));
        if (opacityJitter > 0) currentFlow *= (1 - opacityJitter + Math.random() * opacityJitter);
        
        const tip = getBrushTip(action.color, currentSize, hardness, shape, brushTipData);
        
        ctx.save();
        ctx.globalAlpha = currentFlow;
        ctx.translate(tx, ty);
        
        let currentRotation = (rotation * Math.PI) / 180;
        if (angleFollow) currentRotation += angle;
        if (angleJitter > 0) currentRotation += (Math.random() - 0.5) * angleJitter * Math.PI * 2;
        
        ctx.rotate(currentRotation);
        ctx.drawImage(tip, -tip.width / 2, -tip.height / 2);
        ctx.restore();
      }
    });
    
    if (action.tool === 'measure' && action.points.length >= 2) {
      const p1 = action.points[0];
      const p2 = action.points[1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      
      ctx.save();
      ctx.translate((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      ctx.rotate(angle);
      ctx.fillStyle = action.color;
      ctx.font = `${Math.max(12, size * 2)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(dist)}px`, 0, -5);
      ctx.restore();
    }

    ctx.restore();
  }, []);

  const renderGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    if (gridSettings.type === 'none') return;

    ctx.save();
    ctx.strokeStyle = color === '#ffffff' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
    if (gridSettings.type === 'blueprint') {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    }
    ctx.globalAlpha = gridSettings.opacity;
    ctx.lineWidth = 1 / zoom;

    const size = gridSettings.size;

    if (gridSettings.type === 'square' || gridSettings.type === 'blueprint') {
      ctx.beginPath();
      for (let x = 0; x <= width; x += size) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += size) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      if (gridSettings.type === 'blueprint') {
        ctx.lineWidth = 0.5 / zoom;
        ctx.beginPath();
        for (let x = 0; x <= width; x += size / 5) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += size / 5) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
      }
    } else if (gridSettings.type === 'isometric') {
      const angle = Math.PI / 6;
      const hSize = size * Math.cos(angle);
      const vSize = size * Math.sin(angle);

      ctx.beginPath();
      // Diagonal lines /
      for (let x = -height; x <= width + height; x += hSize * 2) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x + height * Math.tan(angle), height);
      }
      // Diagonal lines \
      for (let x = -height; x <= width + height; x += hSize * 2) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x - height * Math.tan(angle), height);
      }
      // Vertical lines |
      for (let x = 0; x <= width; x += hSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();
    }

    ctx.restore();
  }, [gridSettings, width, height, zoom, color]);

  const redraw = useCallback(() => {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

    const stacks: { base: Layer; clipped: Layer[] }[] = [];
    layers.forEach((layer) => {
      if (layer.isClippingMask && stacks.length > 0) {
        stacks[stacks.length - 1].clipped.push(layer);
      } else {
        stacks.push({ base: layer, clipped: [] });
      }
    });

    stacks.forEach(stack => {
      if (!stack.base.isVisible) return;
      const stackCanvas = document.createElement('canvas');
      stackCanvas.width = mainCanvas.width;
      stackCanvas.height = mainCanvas.height;
      const sCtx = stackCanvas.getContext('2d')!;

      const baseActions = history.filter(a => a.layerId === stack.base.id);
      baseActions.forEach(action => renderAction(sCtx, action));
      
      stack.clipped.forEach(clippedLayer => {
        if (!clippedLayer.isVisible) return;
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = mainCanvas.width;
        layerCanvas.height = mainCanvas.height;
        const lCtx = layerCanvas.getContext('2d')!;
        const layerActions = history.filter(a => a.layerId === clippedLayer.id);
        layerActions.forEach(action => renderAction(lCtx, action));

        sCtx.save();
        sCtx.globalAlpha = clippedLayer.opacity;
        sCtx.globalCompositeOperation = 'source-atop';
        sCtx.drawImage(layerCanvas, 0, 0);
        sCtx.restore();
      });

      ctx.save();
      ctx.globalAlpha = stack.base.opacity;
      ctx.globalCompositeOperation = stack.base.blendMode;
      ctx.drawImage(stackCanvas, 0, 0);
      ctx.restore();
    });

    renderGrid(ctx);

    if (lassoPoints && lassoPoints.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
      lassoPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }, [layers, history, lassoPoints, renderAction, renderGrid]);

  const redrawPreview = useCallback(() => {
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    if (isDrawing && currentPathRef.current.length > 0) {
      if (['line', 'rect', 'circle', 'measure', 'capture'].includes(tool)) {
        const p1 = currentPathRef.current[0];
        const p2 = lastPointRef.current!;
        ctx.save();
        
        if (tool === 'capture') {
          ctx.strokeStyle = '#ff9d00';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          const side = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
          const x = p2.x > p1.x ? p1.x : p1.x - side;
          const y = p2.y > p1.y ? p1.y : p1.y - side;
          ctx.strokeRect(x, y, side, side);
          ctx.fillStyle = 'rgba(255, 157, 0, 0.1)';
          ctx.fillRect(x, y, side, side);
          ctx.restore();
          return;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = settings.size;
        ctx.beginPath();
        if (tool === 'line' || tool === 'measure') {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          if (tool === 'measure') {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            ctx.save();
            ctx.translate((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
            ctx.rotate(angle);
            ctx.fillStyle = color;
            ctx.font = `${Math.max(12, settings.size * 2)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.round(dist)}px`, 0, -5);
            ctx.restore();
          }
        } else if (tool === 'rect') {
          ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        } else if (tool === 'circle') {
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const radius = Math.sqrt(dx * dx + dy * dy);
          ctx.arc(p1.x, p1.y, radius, 0, Math.PI * 2);
        }
        ctx.stroke();
        ctx.restore();
      } else {
        // For regular brushes, we draw the current path segment
        const action = { tool, color, settings, points: currentPathRef.current };
        renderAction(ctx, action);
      }
    }
  }, [isDrawing, tool, color, settings, renderAction]);

  const snapToGrid = (p: Point): Point => {
    if (!gridSettings.snap || gridSettings.type === 'none') return p;
    const size = gridSettings.size;
    if (gridSettings.type === 'square' || gridSettings.type === 'blueprint') {
      return {
        ...p,
        x: Math.round(p.x / size) * size,
        y: Math.round(p.y / size) * size
      };
    } else if (gridSettings.type === 'isometric') {
      const angle = Math.PI / 6;
      const hSize = size * Math.cos(angle);
      const vSize = size * Math.sin(angle);
      
      const row = Math.round(p.y / vSize);
      const col = Math.round(p.x / hSize + (row % 2) * 0.5);
      
      return {
        ...p,
        x: (col - (row % 2) * 0.5) * hSize,
        y: row * vSize
      };
    }
    return p;
  };

  const snapToRuler = (p: Point): Point => {
    if (!ruler.isActive) return p;
    const rad = (ruler.angle * Math.PI) / 180;
    const vx = Math.cos(rad);
    const vy = Math.sin(rad);
    const dx = p.x - ruler.x;
    const dy = p.y - ruler.y;
    const dot = dx * vx + dy * vy;
    return { ...p, x: ruler.x + vx * dot, y: ruler.y + vy * dot };
  };

  const onStart = (e: React.PointerEvent) => {
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (tool === 'pan' || isSpaceDown) {
      setIsPanning(true);
      lastPanPosRef.current = { x: clientX, y: clientY };
      return;
    }
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * width;
    const py = ((clientY - rect.top) / rect.height) * height;

    if (tool === 'ruler') {
      if (!ruler.isActive) {
          setRuler(prev => ({ ...prev, isActive: true, x: px, y: py }));
      } else {
          const dx = px - ruler.x;
          const dy = py - ruler.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 30) {
              setRuler(prev => ({ ...prev, isDragging: true }));
          } else if (dist > (ruler.length / 2 - 40) && dist < (ruler.length / 2 + 40)) {
              setRuler(prev => ({ ...prev, isRotating: true }));
          } else {
              setRuler(prev => ({ ...prev, x: px, y: py, isDragging: true }));
          }
      }
      return;
    }

    if (!activeLayerId) return;
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (activeLayer?.isLocked) return;

    let pressure = e.pressure;
    if (e.pointerType === 'mouse') pressure = 1.0;
    
    let targetPoint: Point = { x: px, y: py, pressure };
    
    if (gridSettings.snap) {
      targetPoint = snapToGrid(targetPoint);
    }

    if (ruler.isActive && (tool === 'pen' || tool === 'brush' || tool === 'eraser' || ['line', 'rect', 'circle', 'measure'].includes(tool))) {
      targetPoint = snapToRuler(targetPoint);
    }

    setIsDrawing(true);
    currentPathRef.current = [targetPoint];
    lastPointRef.current = targetPoint;
    stabilizedPointRef.current = targetPoint; // Initialize stabilizer
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = useCallback((e: PointerEvent) => {
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (isPanning && lastPanPosRef.current) {
      const dx = clientX - lastPanPosRef.current.x;
      const dy = clientY - lastPanPosRef.current.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPosRef.current = { x: clientX, y: clientY };
      return;
    }
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * width;
    const py = ((clientY - rect.top) / rect.height) * height;

    if (ruler.isDragging) {
        setRuler(prev => ({ ...prev, x: px, y: py }));
        return;
    }
    if (ruler.isRotating) {
        const angle = Math.atan2(py - ruler.y, px - ruler.x) * (180 / Math.PI);
        setRuler(prev => ({ ...prev, angle }));
        return;
    }

    if (!isDrawing || !activeLayerId) return;
    
    let pressure = e.pressure;
    if (e.pointerType === 'mouse') pressure = 1.0;
    
    let targetPoint: Point = { x: px, y: py, pressure };
    
    if (gridSettings.snap) {
      targetPoint = snapToGrid(targetPoint);
    }

    if (ruler.isActive && (tool === 'pen' || tool === 'brush' || tool === 'eraser' || ['line', 'rect', 'circle', 'measure'].includes(tool))) {
        targetPoint = snapToRuler(targetPoint);
    }
    
    // Multi-Stage Smoothing System
    if (stabilizedPointRef.current) {
      // 1. "Rope" Smoothing (Smoothing Delay)
      // smoothingDelay is interpreted as rope radius (0 to 500)
      if (settings.smoothingDelay > 0) {
        const dx = targetPoint.x - stabilizedPointRef.current.x;
        const dy = targetPoint.y - stabilizedPointRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ropeLength = settings.smoothingDelay * 0.5; // Scaled for better feel

        if (dist > ropeLength) {
          const ratio = (dist - ropeLength) / dist;
          targetPoint.x = stabilizedPointRef.current.x + dx * ratio;
          targetPoint.y = stabilizedPointRef.current.y + dy * ratio;
        } else {
          // Point stays within rope slack - don't update targetPoint position
          targetPoint.x = stabilizedPointRef.current.x;
          targetPoint.y = stabilizedPointRef.current.y;
        }
      }

      // 2. Exponential Smoothing (Stabilization)
      const weight = 1 - Math.pow(settings.stabilization, 0.5);
      let smoothedX = stabilizedPointRef.current.x + (targetPoint.x - stabilizedPointRef.current.x) * weight;
      let smoothedY = stabilizedPointRef.current.y + (targetPoint.y - stabilizedPointRef.current.y) * weight;
      
      // 3. Secondary Smoothing (Smoothing Aggression)
      if (settings.smoothingAggression > 0) {
        const aggWeight = 1 - Math.pow(settings.smoothingAggression, 0.8);
        smoothedX = stabilizedPointRef.current.x + (smoothedX - stabilizedPointRef.current.x) * aggWeight;
        smoothedY = stabilizedPointRef.current.y + (smoothedY - stabilizedPointRef.current.y) * aggWeight;
      }

      const smoothedPressure = (stabilizedPointRef.current.pressure ?? 1) + ((targetPoint.pressure ?? 1) - (stabilizedPointRef.current.pressure ?? 1)) * weight;
      targetPoint = { x: smoothedX, y: smoothedY, pressure: smoothedPressure };
    }
    
    if (ruler.isActive && (tool === 'pen' || tool === 'brush' || tool === 'eraser' || ['line', 'rect', 'circle', 'measure'].includes(tool))) {
        targetPoint = snapToRuler(targetPoint);
    }
    
    if (['line', 'rect', 'circle', 'measure', 'capture'].includes(tool)) {
      redrawPreview();
      return;
    }
    
    const ctx = previewCanvasRef.current?.getContext('2d');
    if (ctx) {
      const activeLayer = layers.find(l => l.id === activeLayerId);
      ctx.save();
      if (activeLayer?.isAlphaLocked) ctx.globalCompositeOperation = 'source-atop';
      
      const action = { tool, color, settings, points: [lastPointRef.current!, targetPoint] };
      renderAction(ctx, action);
      ctx.restore();
    }
    
    currentPathRef.current.push(targetPoint);
    lastPointRef.current = targetPoint;
    stabilizedPointRef.current = targetPoint;
  }, [isPanning, isDrawing, tool, color, settings, width, height, activeLayerId, layers, renderAction, ruler, redrawPreview]);

  const onEnd = useCallback((e: PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      lastPanPosRef.current = null;
    } else if (ruler.isDragging || ruler.isRotating) {
      setRuler(prev => ({ ...prev, isDragging: false, isRotating: false }));
    } else if (isDrawing) {
      setIsDrawing(false);
      if (tool === 'lasso') {
          setLassoPoints(currentPathRef.current);
      } else if (tool === 'capture') {
          const p1 = currentPathRef.current[0];
          const p2 = lastPointRef.current!;
          const side = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
          if (side > 5 && onCapture) {
            const x = p2.x > p1.x ? p1.x : p1.x - side;
            const y = p2.y > p1.y ? p1.y : p1.y - side;
            
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = side;
            cropCanvas.height = side;
            const cropCtx = cropCanvas.getContext('2d');
            
            if (cropCtx && canvasRef.current) {
              cropCtx.drawImage(canvasRef.current, x, y, side, side, 0, 0, side, side);
              onCapture(cropCanvas.toDataURL());
            }
          }
      } else if (['line', 'rect', 'circle', 'measure'].includes(tool)) {
          const p1 = currentPathRef.current[0];
          const p2 = lastPointRef.current!;
          let points: Point[] = [];
          if (tool === 'line' || tool === 'measure') {
            points = [p1, p2];
          } else if (tool === 'rect') {
            points = [
              p1,
              { x: p2.x, y: p1.y },
              p2,
              { x: p1.x, y: p2.y },
              p1
            ];
          } else if (tool === 'circle') {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const radius = Math.sqrt(dx * dx + dy * dy);
            const segments = 64;
            for (let i = 0; i <= segments; i++) {
              const angle = (i / segments) * Math.PI * 2;
              points.push({
                x: p1.x + Math.cos(angle) * radius,
                y: p1.y + Math.sin(angle) * radius
              });
            }
          }

          onActionComplete({
            tool,
            color, settings: { ...settings },
            points,
            id: Date.now().toString(),
            layerId: activeLayerId!
          });
      } else {
          onActionComplete({
              tool, color, settings: { ...settings },
              points: [...currentPathRef.current],
              id: Date.now().toString(),
              layerId: activeLayerId!
          });
      }
      redraw();
      stabilizedPointRef.current = null;
    }
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch(err) {}
  }, [isPanning, isDrawing, tool, color, settings, activeLayerId, onActionComplete, redraw, ruler.isDragging, ruler.isRotating]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpaceDown) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        setIsSpaceDown(true);
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceDown(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpaceDown]);

  useEffect(() => {
    if (isDrawing || isPanning || ruler.isDragging || ruler.isRotating) {
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
    }
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [isDrawing, isPanning, ruler.isDragging, ruler.isRotating, onMove, onEnd]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.005;
        setZoom(prev => Math.max(0.1, Math.min(10, prev + delta)));
      }
    };
    const el = containerRef.current;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el?.removeEventListener('wheel', handleWheel);
  }, []);

  useImperativeHandle(ref, () => ({
    getDataUrl: () => {
        const c = canvasRef.current;
        if (!c) return '';
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = width;
        exportCanvas.height = height;
        const eCtx = exportCanvas.getContext('2d')!;
        eCtx.fillStyle = backgroundColor;
        eCtx.fillRect(0, 0, width, height);
        eCtx.drawImage(c, 0, 0);
        return exportCanvas.toDataURL();
    },
    clearSelection: () => { setLassoPoints(null); redraw(); },
    resetView: () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }
  }));

  useEffect(() => { redraw(); redrawPreview(); }, [redraw, redrawPreview, width, height]);

  const cursorClass = (tool === 'pan' || isSpaceDown) 
    ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') 
    : 'cursor-crosshair';

  return (
    <div ref={containerRef} className="flex-1 w-full h-full overflow-hidden flex items-center justify-center bg-[#0d0f14]">
      <div 
        className={`relative shadow-[0_40px_100px_rgba(0,0,0,0.8)] border-[1px] border-white/5 transition-opacity duration-300 ${cursorClass}`}
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: (isPanning || isDrawing || ruler.isDragging || ruler.isRotating) ? 'none' : 'transform 0.1s ease-out'
        }}
        onPointerDown={onStart}
      >
        <div className="absolute inset-0 -z-10" style={{ backgroundColor }} />
        <canvas 
          ref={canvasRef} 
          width={width}
          height={height}
          style={{ 
            width: 'auto', 
            height: 'auto', 
            maxWidth: '100%', 
            maxHeight: '100%',
            display: 'block',
            backgroundColor: 'transparent'
          }}
        />
        <canvas 
          ref={previewCanvasRef} 
          width={width}
          height={height}
          className="absolute inset-0 pointer-events-none"
          style={{ 
            width: 'auto', 
            height: 'auto', 
            maxWidth: '100%', 
            maxHeight: '100%',
            display: 'block',
            backgroundColor: 'transparent'
          }}
        />
        {ruler.isActive && (
           <div 
             className="absolute pointer-events-none z-[100]"
             style={{
               left: ruler.x,
               top: ruler.y,
               width: ruler.length,
               height: 60,
               transform: `translate(-50%, -50%) rotate(${ruler.angle}deg)`,
               backgroundColor: 'rgba(255, 255, 255, 0.05)',
               backdropFilter: 'blur(12px)',
               border: '1px solid rgba(255, 255, 255, 0.1)',
               borderRadius: 4,
               boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
               opacity: tool === 'ruler' ? 1 : 0.4
             }}
           >
              <div className="absolute inset-0 flex items-start justify-between px-4 pt-1 opacity-20">
                {Array.from({ length: 41 }).map((_, i) => (
                  <div key={i} className={`bg-white ${i % 5 === 0 ? 'h-4 w-[1px]' : 'h-2 w-[0.5px]'}`} />
                ))}
              </div>
              {tool === 'ruler' && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-amber-500/50 bg-amber-500/10 flex items-center justify-center">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
});

export default Canvas;
