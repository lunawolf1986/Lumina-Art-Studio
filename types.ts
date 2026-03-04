
export type Tool = 'pen' | 'brush' | 'eraser' | 'circle' | 'lasso' | 'pan' | 'transform' | 'adjust' | 'frame' | 'ruler' | 'line' | 'rect' | 'measure' | 'capture';
export type SymmetryMode = 'off' | 'vertical' | 'horizontal' | 'radial';
export type Theme = 'light' | 'dark' | 'blueprint';
export type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'white';
export type ColorProfile = 'sRGB' | 'AdobeRGB' | 'DisplayP3';
export type BlendMode = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'lighter';

export type GridType = 'none' | 'square' | 'isometric' | 'blueprint';

export interface GridSettings {
  type: GridType;
  size: number;
  opacity: number;
  snap: boolean;
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface RulerState {
  isActive: boolean;
  x: number;
  y: number;
  angle: number; // in degrees
  length: number;
  isDragging: boolean;
  isRotating: boolean;
}

export interface BrushSettings {
  size: number;
  hardness: number; // 0 to 1
  spacing: number; // 0.01 to 2.0
  flow: number;    // 0 to 1
  jitter: number;  // 0 to 1 (Position scattering)
  angleJitter: number; // 0 to 1
  sizeJitter: number;  // 0 to 1
  opacityJitter: number; // 0 to 1
  stabilization: number;
  smoothingAggression: number;
  smoothingDelay: number;
  shape: 'round' | 'custom' | 'textured' | 'square' | 'chisel';
  brushTipData?: string;
  grainData?: string;
  grainScale?: number;
  grainStrength?: number; // 0 to 1
  rotation: number;
  angleFollow: boolean;
  thicknessStart: number; // 0 to 1
  thicknessEnd: number;   // 0 to 1
  opacityStart: number;   // 0 to 1
  opacityEnd: number;     // 0 to 1
  forceFade: boolean;
  fadeLengthStart: number; // 0 to 1
  fadeLengthEnd: number;   // 0 to 1
  fadeShape: number;       // 0 to 1
  // Pressure Settings
  pressureSize: boolean;
  pressureOpacity: boolean;
  pressureCurve: number; // Power curve factor
}

export interface BrushPreset {
  id: string;
  name: string;
  category: string;
  tool: Tool;
  settings: BrushSettings;
  preview?: string;
  isDefault?: boolean;
}

export interface Layer {
  id: string;
  name: string;
  isVisible: boolean;
  opacity: number;
  blendMode: BlendMode;
  isAlphaLocked: boolean;
  isClippingMask: boolean;
  isLocked: boolean;
}

export interface DrawingAction {
  tool: Tool;
  points: Point[];
  color: string;
  settings: BrushSettings;
  id: string;
  layerId: string;
}

export interface SavedProject {
  id: string;
  name: string;
  thumbnail: string;
  lastModified: number;
  layers: Layer[];
  history: DrawingAction[];
  width: number;
  height: number;
  backgroundColor: string;
  gridSettings: GridSettings;
  activeLayerId: string | null;
}
