
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Canvas, { CanvasHandle } from './components/Canvas';
import Toolbar from './components/Toolbar';
import LayersPanel from './components/LayersPanel';
import ColorPanel from './components/ColorPanel';
import BrushCreator from './components/BrushCreator';
import { 
  Undo as UndoIcon, Redo as RedoIcon, Scissors, ChevronRight, ChevronLeft, 
  Download, Monitor, Layers as LayersIcon, Palette as PaletteIcon, 
  Settings2, Upload, Circle, Maximize, Square, Image as ImageIcon, 
  RotateCcw, Zap, Book, BookOpen, FileText, Smartphone, Layout, Tv, Twitter, Youtube, Printer,
  Sparkles, PenTool, Smartphone as PhoneIcon, Instagram, Languages, Columns, Rows, Tally4, Grid3X3,
  // Added missing Wind icon import
  Wind,
  MousePointer2, Ruler as RulerIcon, Box, Type, Hash, Compass
} from 'lucide-react';
import { Tool, DrawingAction, BrushSettings, Layer, Theme, AccentColor, BrushPreset, Point, GridSettings, SavedProject } from './types';

const STUDIO_PALETTE = ["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#00FFFF", "#FF00FF"];

const DEFAULT_BRUSH_SETTINGS: BrushSettings = {
  size: 20, hardness: 0.8, spacing: 0.02, flow: 1.0, jitter: 0.0,
  angleJitter: 0.0, sizeJitter: 0.0, opacityJitter: 0.0,
  stabilization: 0.5, smoothingAggression: 0, smoothingDelay: 0,
  shape: 'round', rotation: 0, angleFollow: false,
  thicknessStart: 1.0, thicknessEnd: 1.0, opacityStart: 1.0, opacityEnd: 1.0,
  forceFade: false, fadeLengthStart: 0.3, fadeLengthEnd: 0.3, fadeShape: 0.5,
  pressureSize: true, pressureOpacity: true, pressureCurve: 1.6
};

const INITIAL_PRESETS: BrushPreset[] = [
  // ANIME & MANGA
  { id: 'anime-mapping-pen', name: 'Mapping Pen', category: 'Anime', tool: 'pen', settings: { ...DEFAULT_BRUSH_SETTINGS, size: 2, hardness: 1.0, flow: 1.0, stabilization: 0.8, thicknessStart: 0.1, thicknessEnd: 0.1, fadeLengthStart: 0.2, fadeLengthEnd: 0.3, pressureSize: true, pressureCurve: 1.8 } },
  { id: 'anime-g-pen-pro', name: 'G-Pen Pro', category: 'Anime', tool: 'pen', settings: { ...DEFAULT_BRUSH_SETTINGS, size: 4, hardness: 1.0, flow: 1.0, stabilization: 0.7, thicknessStart: 0.2, thicknessEnd: 0.2, fadeLengthStart: 0.15, fadeLengthEnd: 0.2, pressureSize: true, pressureCurve: 1.8 } },
  { id: 'anime-cell-shade', name: 'Cell Shading', category: 'Anime', tool: 'brush', settings: { ...DEFAULT_BRUSH_SETTINGS, size: 35, hardness: 1.0, flow: 1.0, spacing: 0.01, stabilization: 0.4, pressureSize: false, pressureOpacity: false } },
  { id: 'anime-soft-air', name: 'Anime Airbrush', category: 'Anime', tool: 'brush', settings: { ...DEFAULT_BRUSH_SETTINGS, size: 120, hardness: 0.1, flow: 0.15, spacing: 0.05, stabilization: 0.2, pressureOpacity: true, pressureSize: false, pressureCurve: 1.5 } },
  
  // TEXTURED & NATURAL
  { id: 'charcoal-gritty', name: 'Charcoal Stick', category: 'Sumi-e', tool: 'brush', settings: { ...DEFAULT_BRUSH_SETTINGS, size: 25, hardness: 0.4, flow: 0.8, spacing: 0.08, shape: 'textured', jitter: 0.1, angleJitter: 0.5, stabilization: 0.3, pressureSize: true, pressureOpacity: true, pressureCurve: 1.4 } },
  { id: 'thick-oil', name: 'Thick Oil', category: 'Thick Paint', tool: 'brush', settings: { ...DEFAULT_BRUSH_SETTINGS, size: 40, hardness: 0.9, flow: 1.0, spacing: 0.02, shape: 'chisel', rotation: 45, angleFollow: true, stabilization: 0.5, pressureSize: true, pressureCurve: 1.3 } },
  { id: 'sponge-texture', name: 'Sea Sponge', category: 'Watercolor', tool: 'brush', settings: { ...DEFAULT_BRUSH_SETTINGS, size: 60, hardness: 0.5, flow: 0.4, spacing: 0.3, shape: 'textured', jitter: 0.6, sizeJitter: 0.4, opacityJitter: 0.3, angleJitter: 1.0, stabilization: 0.1 } },
  { id: 'dry-brush', name: 'Dry Brush', category: 'Sumi-e', tool: 'brush', settings: { ...DEFAULT_BRUSH_SETTINGS, size: 30, hardness: 0.2, flow: 0.7, spacing: 0.1, shape: 'textured', thicknessStart: 0.5, thicknessEnd: 0.1, fadeLengthEnd: 0.5, stabilization: 0.4, pressureSize: true, pressureCurve: 1.4 } },

  // PENCILS
  { id: 'hb-pencil', name: 'HB Pencil', category: 'Pencils', tool: 'brush', settings: { ...DEFAULT_BRUSH_SETTINGS, size: 4, hardness: 0.7, flow: 0.9, spacing: 0.04, jitter: 0.05, shape: 'textured', stabilization: 0.6, pressureSize: true, pressureOpacity: true, pressureCurve: 1.6 } },
  { id: 'soft-2b', name: 'Soft 2B', category: 'Pencils', tool: 'brush', settings: { ...DEFAULT_BRUSH_SETTINGS, size: 8, hardness: 0.6, flow: 0.8, spacing: 0.05, jitter: 0.1, shape: 'textured', stabilization: 0.5, pressureSize: true, pressureCurve: 1.6 } },
  
  // PENS
  { id: 'tech-pen', name: 'Technical Pen', category: 'Pens', tool: 'pen', settings: { ...DEFAULT_BRUSH_SETTINGS, size: 2, hardness: 1, flow: 1.0, stabilization: 0.9, spacing: 0.001, pressureSize: false } },
  { id: 'chisel-marker', name: 'Chisel Marker', category: 'Pens', tool: 'brush', settings: { ...DEFAULT_BRUSH_SETTINGS, size: 15, hardness: 1.0, flow: 0.9, spacing: 0.02, shape: 'chisel', rotation: -30, angleFollow: false, stabilization: 0.4, pressureSize: false } },
  
  // BLUEPRINT TOOLS
  { id: 'blueprint-line', name: 'Drafting Line', category: 'Blueprint', tool: 'line', settings: { ...DEFAULT_BRUSH_SETTINGS, size: 1, hardness: 1.0, flow: 1.0, stabilization: 1.0, pressureSize: false, pressureOpacity: false } },
  { id: 'blueprint-heavy', name: 'Heavy Border', category: 'Blueprint', tool: 'line', settings: { ...DEFAULT_BRUSH_SETTINGS, size: 3, hardness: 1.0, flow: 1.0, stabilization: 1.0, pressureSize: false, pressureOpacity: false } },
  { id: 'blueprint-dim', name: 'Dimension Line', category: 'Blueprint', tool: 'measure', settings: { ...DEFAULT_BRUSH_SETTINGS, size: 1, hardness: 1.0, flow: 0.6, stabilization: 1.0, pressureSize: false, pressureOpacity: false } },
];

const createNewLayer = (name: string): Layer => ({
  id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name, isVisible: true, opacity: 1, blendMode: 'source-over',
  isAlphaLocked: false, isClippingMask: false, isLocked: false,
});

const CANVAS_PRESETS = [
  { group: 'Anime & Manga', presets: [
    { name: 'Manga B4 (Pro Standard)', width: 3035, height: 4302, icon: Book, desc: 'Official Japanese Manuscript size' },
    { name: 'Manga A4 (Doujinshi)', width: 2480, height: 3508, icon: BookOpen, desc: 'Standard Doujin/Self-publish size' },
    { name: 'Anime Broadcast 4K', width: 3840, height: 2160, icon: Tv, desc: '16:9 Ultra High Definition' },
    { name: 'Anime Broadcast 1080p', width: 1920, height: 1080, icon: Monitor, desc: 'Standard Production size' },
    { name: 'Webtoon (Long Strip)', width: 800, height: 12800, icon: FileText, desc: 'Extra long vertical scroll' },
  ]},
  { group: 'Social & Web', presets: [
    { name: 'Pixiv / Twitter Portrait', width: 1600, height: 2400, icon: ImageIcon, desc: 'Ideal for social art posts' },
    { name: 'TikTok / Reel / Story', width: 1080, height: 1920, icon: PhoneIcon, desc: '9:16 Vertical video ratio' },
    { name: 'Standard Square (1:1)', width: 2048, height: 2048, icon: Square, desc: 'Profile icons & Avatars' },
  ]},
  { group: 'Professional Print', presets: [
    { name: 'A3 Poster (300dpi)', width: 3508, height: 4961, icon: Printer, desc: 'High-res large format print' },
    { name: 'US Letter', width: 2550, height: 3300, icon: FileText, desc: 'Standard 8.5" x 11"' },
  ]}
];

export interface PaletteCollection {
  id: string;
  name: string;
  colors: string[];
}

const App: React.FC = () => {
  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState('#000000');
  const [swatches, setSwatches] = useState<string[]>(() => {
    const saved = localStorage.getItem('lumina_swatches');
    return saved ? JSON.parse(saved) : STUDIO_PALETTE;
  });

  const [savedPalettes, setSavedPalettes] = useState<PaletteCollection[]>(() => {
    const saved = localStorage.getItem('lumina_saved_palettes');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [brushSettings, setBrushSettings] = useState<BrushSettings>(DEFAULT_BRUSH_SETTINGS);
  const [layers, setLayers] = useState<Layer[]>(() => [createNewLayer('Background')]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'layers' | 'colors' | 'brush' | 'frames' | 'blueprint'>('colors');
  const [isBrushCreatorOpen, setIsBrushCreatorOpen] = useState(false);
  const [projectName, setProjectName] = useState('My Masterpiece');
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 3035, height: 4302 });
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState('#ffffff');
  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [setupTab, setSetupTab] = useState<'new' | 'gallery'>('new');
  
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    type: 'none',
    size: 50,
    opacity: 0.2,
    snap: false
  });

  const [frameRows, setFrameRows] = useState(3);
  const [frameCols, setFrameCols] = useState(2);
  const [frameGutter, setFrameGutter] = useState(20);
  const [frameMargin, setFrameMargin] = useState(40);
  const [frameThickness, setFrameThickness] = useState(4);

  const [customPresets, setCustomPresets] = useState<BrushPreset[]>(() => {
    const saved = localStorage.getItem('lumina_custom_brushes');
    return saved ? JSON.parse(saved) : [];
  });

  const allPresets = useMemo(() => [...INITIAL_PRESETS, ...customPresets], [customPresets]);
  const [theme, setTheme] = useState<Theme>('dark');
  const [accent, setAccent] = useState<AccentColor>('blue');
  const [history, setHistory] = useState<DrawingAction[]>([]);
  const [redoStack, setRedoStack] = useState<DrawingAction[]>([]);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() => {
    const saved = localStorage.getItem('lumina_saved_projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  
  const canvasRef = useRef<CanvasHandle>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  useEffect(() => {
    localStorage.setItem('lumina_swatches', JSON.stringify(swatches));
  }, [swatches]);

  useEffect(() => {
    localStorage.setItem('lumina_saved_palettes', JSON.stringify(savedPalettes));
  }, [savedPalettes]);

  useEffect(() => {
    localStorage.setItem('lumina_custom_brushes', JSON.stringify(customPresets));
  }, [customPresets]);

  useEffect(() => {
    localStorage.setItem('lumina_saved_projects', JSON.stringify(savedProjects));
  }, [savedProjects]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-accent', accent);
  }, [theme, accent]);

  useEffect(() => {
    if (!activeLayerId && layers.length > 0) setActiveLayerId(layers[layers.length - 1].id);
  }, [layers, activeLayerId]);

  const handleActionComplete = useCallback((action: DrawingAction) => {
    setHistory(prev => [...prev, action]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setRedoStack(prev => [last, ...prev]);
  }, [history]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setRedoStack(prev => prev.slice(1));
    setHistory(prev => [...prev, next]);
  }, [redoStack]);

  const handleMergeDown = () => {
    const idx = layers.findIndex(l => l.id === activeLayerId);
    if (idx <= 0) return;
    const top = layers[idx];
    const bottom = layers[idx - 1];
    if (!window.confirm(`Merge "${top.name}" into "${bottom.name}"?`)) return;
    const newHistory = history.map(a => a.layerId === top.id ? { ...a, layerId: bottom.id } : a);
    setHistory(newHistory);
    setLayers(prev => prev.filter(l => l.id !== top.id));
    setActiveLayerId(bottom.id);
  };

  const handleSaveBrush = (brush: BrushPreset) => {
    setCustomPresets(prev => [...prev, brush]);
    setIsBrushCreatorOpen(false);
  };

  const handleSavePaletteCollection = (name: string) => {
    const newPalette: PaletteCollection = {
      id: `palette_${Date.now()}`,
      name,
      colors: [...swatches]
    };
    setSavedPalettes(prev => [newPalette, ...prev]);
  };

  const handleRestorePalette = (palette: PaletteCollection) => {
    setSwatches(palette.colors);
  };

  const handleDeletePalette = (id: string) => {
    setSavedPalettes(prev => prev.filter(p => p.id !== id));
  };

  const generateComicFrames = useCallback((preset?: '4koma' | 'daily' | 'sunday' | 'action') => {
    if (!activeLayerId) return;
    
    let rows = frameRows;
    let cols = frameCols;

    if (preset === '4koma') { rows = 4; cols = 1; }
    else if (preset === 'daily') { rows = 1; cols = 3; }
    else if (preset === 'sunday') { rows = 3; cols = 2; }
    else if (preset === 'action') { rows = 2; cols = 2; }

    const actions: DrawingAction[] = [];
    const w = canvasDimensions.width;
    const h = canvasDimensions.height;
    const usableW = w - (frameMargin * 2);
    const usableH = h - (frameMargin * 2);
    const panelW = (usableW - (frameGutter * (cols - 1))) / cols;
    const panelH = (usableH - (frameGutter * (rows - 1))) / rows;

    const createRectAction = (x: number, y: number, width: number, height: number) => {
      const points: Point[] = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
        { x, y }
      ];
      return {
        tool: 'pen' as Tool,
        color,
        settings: { ...DEFAULT_BRUSH_SETTINGS, size: frameThickness, hardness: 1.0 },
        points,
        id: `frame_${Date.now()}_${Math.random()}`,
        layerId: activeLayerId
      };
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = frameMargin + (c * (panelW + frameGutter));
        const y = frameMargin + (r * (panelH + frameGutter));
        actions.push(createRectAction(x, y, panelW, panelH));
      }
    }
    setHistory(prev => [...prev, ...actions]);
    setRedoStack([]);
  }, [canvasDimensions, frameRows, frameCols, frameGutter, frameMargin, frameThickness, activeLayerId, color]);

  const handleApplyBlueprintTheme = () => {
    setTheme('blueprint');
    setAccent('white');
    setCanvasBackgroundColor('#003366');
    setColor('#ffffff');
    setGridSettings(prev => ({ ...prev, type: 'blueprint', opacity: 0.3, snap: true }));
  };

  const handleSaveProject = useCallback(() => {
    const thumbnail = canvasRef.current?.getDataUrl() || '';
    const existingProject = savedProjects.find(p => p.id === currentProjectId);
    
    const project: SavedProject = {
      id: currentProjectId || `proj_${Date.now()}`,
      name: existingProject ? existingProject.name : projectName || `Project ${savedProjects.length + 1}`,
      thumbnail,
      lastModified: Date.now(),
      layers,
      history,
      width: canvasDimensions.width,
      height: canvasDimensions.height,
      backgroundColor: canvasBackgroundColor,
      gridSettings,
      activeLayerId
    };

    setSavedProjects(prev => {
      const exists = prev.find(p => p.id === project.id);
      if (exists) {
        return prev.map(p => p.id === project.id ? project : p);
      }
      return [project, ...prev];
    });
    setCurrentProjectId(project.id);
    alert('Project saved successfully!');
  }, [currentProjectId, savedProjects, layers, history, canvasDimensions, canvasBackgroundColor, gridSettings, activeLayerId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        handleRedo();
      }
      
      // Save
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        handleSaveProject();
      }

      // Tool switching (only if not in input)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'KeyB': setTool('brush'); break;
        case 'KeyE': setTool('eraser'); break;
        case 'KeyP': setTool('pen'); break;
        case 'KeyL': setTool('line'); break;
        case 'KeyR': setTool('rect'); break;
        case 'KeyC': setTool('circle'); break;
        case 'KeyM': setTool('measure'); break;
        case 'KeyV': setTool('pan'); break;
        case 'BracketLeft': 
          setBrushSettings(prev => ({ ...prev, size: Math.max(1, prev.size - 5) }));
          break;
        case 'BracketRight':
          setBrushSettings(prev => ({ ...prev, size: Math.min(500, prev.size + 5) }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleSaveProject]);

  const handleLoadProject = (project: SavedProject) => {
    setCanvasDimensions({ width: project.width, height: project.height });
    setCanvasBackgroundColor(project.backgroundColor);
    setLayers(project.layers);
    setHistory(project.history);
    setGridSettings(project.gridSettings);
    setActiveLayerId(project.activeLayerId);
    setCurrentProjectId(project.id);
    setRedoStack([]);
    setIsSetupOpen(false);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this project?')) {
      setSavedProjects(prev => prev.filter(p => p.id !== id));
      if (currentProjectId === id) setCurrentProjectId(null);
    }
  };

  const handleNewProject = () => {
    // Use the dimensions already set in the setup screen
    setCanvasBackgroundColor('#ffffff');
    const bgLayer = createNewLayer('Background');
    setLayers([bgLayer]);
    setHistory([]);
    setRedoStack([]);
    setActiveLayerId(bgLayer.id);
    
    // Create a new project entry if we want it to show up in gallery immediately
    // Or just set the current project name
    const newId = `proj_${Date.now()}`;
    setCurrentProjectId(null); // It's a new unsaved project, but we have a name ready
    setIsSetupOpen(false);
  };

  if (isSetupOpen) {
    return (
      <div className="fixed inset-0 z-[600] bg-[var(--color-bg-primary)] flex items-center justify-center font-inter p-4 md:p-6">
        <div className="bg-[var(--color-bg-secondary)] w-full max-w-[580px] max-h-[95vh] rounded-3xl border border-[var(--color-border)] shadow-[0_40px_100px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden animate-in">
          <div className="p-6 md:p-8 flex flex-col items-center text-center gap-1 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/30">
             <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--h),var(--s),var(--l),0.1)] flex items-center justify-center text-[hsl(var(--h),var(--s),var(--l))] mb-3 border border-[hsl(var(--h),var(--s),var(--l),0.2)]">
                <PenTool size={24} />
             </div>
             <h1 className="text-xl md:text-2xl font-black uppercase tracking-[0.2em]">Lumina Studio</h1>
             <div className="flex gap-4 mt-4">
                <button onClick={() => setSetupTab('new')} className={`text-[10px] font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${setupTab === 'new' ? 'border-[hsl(var(--h),var(--s),var(--l))] text-[hsl(var(--h),var(--s),var(--l))]' : 'border-transparent opacity-40 hover:opacity-100'}`}>New Project</button>
                <button onClick={() => setSetupTab('gallery')} className={`text-[10px] font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${setupTab === 'gallery' ? 'border-[hsl(var(--h),var(--s),var(--l))] text-[hsl(var(--h),var(--s),var(--l))]' : 'border-transparent opacity-40 hover:opacity-100'}`}>Project Gallery ({savedProjects.length})</button>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
            {setupTab === 'new' ? (
              <>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Project Name</label>
                      <input 
                        type="text" 
                        placeholder="Enter project name..." 
                        value={projectName} 
                        onChange={e => setProjectName(e.target.value)} 
                        className="w-full bg-black/30 border border-[var(--color-border)] rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-[hsl(var(--h),var(--s),var(--l))] transition-all" 
                      />
                  </div>

                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--h),var(--s),var(--l))] flex items-center gap-2">
                      <span className="w-4 h-px bg-current opacity-30" />
                      Custom Canvas Size
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                          <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Width (px)</label>
                          <input type="number" value={canvasDimensions.width} onChange={e => setCanvasDimensions(p => ({...p, width: parseInt(e.target.value) || 0}))} className="w-full bg-black/30 border border-[var(--color-border)] rounded-xl px-4 py-3 text-[13px] font-mono font-bold outline-none focus:border-[hsl(var(--h),var(--s),var(--l))] transition-all" />
                      </div>
                      <div className="flex flex-col gap-2">
                          <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Height (px)</label>
                          <input type="number" value={canvasDimensions.height} onChange={e => setCanvasDimensions(p => ({...p, height: parseInt(e.target.value) || 0}))} className="w-full bg-black/30 border border-[var(--color-border)] rounded-xl px-4 py-3 text-[13px] font-mono font-bold outline-none focus:border-[hsl(var(--h),var(--s),var(--l))] transition-all" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--h),var(--s),var(--l))] flex items-center gap-2">
                      <span className="w-4 h-px bg-current opacity-30" />
                      Quick Ratios
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                       <button onClick={() => setCanvasDimensions({width: 1920, height: 1080})} className="py-2 bg-black/20 border border-white/5 rounded-lg text-[9px] font-black uppercase hover:border-[hsl(var(--h),var(--s),var(--l))] transition-all">16:9</button>
                       <button onClick={() => setCanvasDimensions({width: 1080, height: 1920})} className="py-2 bg-black/20 border border-white/5 rounded-lg text-[9px] font-black uppercase hover:border-[hsl(var(--h),var(--s),var(--l))] transition-all">9:16</button>
                       <button onClick={() => setCanvasDimensions({width: 2048, height: 2048})} className="py-2 bg-black/20 border border-white/5 rounded-lg text-[9px] font-black uppercase hover:border-[hsl(var(--h),var(--s),var(--l))] transition-all">1:1</button>
                       <button onClick={() => setCanvasDimensions({width: 2400, height: 1800})} className="py-2 bg-black/20 border border-white/5 rounded-lg text-[9px] font-black uppercase hover:border-[hsl(var(--h),var(--s),var(--l))] transition-all">4:3</button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {CANVAS_PRESETS.map((group) => (
                    <div key={group.group} className="flex flex-col gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--h),var(--s),var(--l))] flex items-center gap-2">
                          <span className="w-4 h-px bg-current opacity-30" />
                          {group.group}
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                          {group.presets.map((preset) => (
                            <button key={preset.name} onClick={() => setCanvasDimensions({ width: preset.width, height: preset.height })} className={`group flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${canvasDimensions.width === preset.width && canvasDimensions.height === preset.height ? 'bg-[hsl(var(--h),var(--s),var(--l),0.1)] border-[hsl(var(--h),var(--s),var(--l))]' : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'}`}>
                                <div className="flex items-center gap-4">
                                  <div className={`p-2.5 rounded-xl transition-colors ${canvasDimensions.width === preset.width && canvasDimensions.height === preset.height ? 'bg-[hsl(var(--h),var(--s),var(--l))] text-white' : 'bg-white/5 text-white/40 group-hover:text-white'}`}>
                                      <preset.icon size={18} />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                      <span className={`text-[11px] font-black uppercase tracking-tight ${canvasDimensions.width === preset.width && canvasDimensions.height === preset.height ? 'text-[hsl(var(--h),var(--s),var(--l))]' : 'text-white/80'}`}>{preset.name}</span>
                                      <span className="text-[9px] font-bold opacity-30">{preset.desc}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono font-black opacity-30 tabular-nums">{preset.width}x{preset.height}</span>
                            </button>
                          ))}
                        </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {savedProjects.length === 0 ? (
                  <div className="col-span-2 py-20 flex flex-col items-center justify-center text-center opacity-30 gap-4">
                    <ImageIcon size={48} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">No saved projects yet</p>
                  </div>
                ) : (
                  savedProjects.map(project => (
                    <div 
                      key={project.id} 
                      onClick={() => handleLoadProject(project)}
                      className="group relative bg-black/30 border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-[hsl(var(--h),var(--s),var(--l))] transition-all"
                    >
                      <div className="aspect-[3/4] bg-[var(--color-bg-tertiary)] overflow-hidden">
                        <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      </div>
                      <div className="p-3 flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-tight truncate">{project.name}</span>
                        <span className="text-[8px] font-bold opacity-30">{new Date(project.lastModified).toLocaleDateString()}</span>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                      >
                        <Scissors size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/30">
            {setupTab === 'new' ? (
              <button onClick={handleNewProject} className="w-full py-4 bg-[hsl(var(--h),var(--s),var(--l))] text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] shadow-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                Start New Project <Languages size={14} className="opacity-40" />
              </button>
            ) : (
              <button onClick={() => setSetupTab('new')} className="w-full py-4 bg-white/5 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all">
                Create New Instead
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="w-screen h-screen overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col font-inter">
      <header className="h-10 md:h-12 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex items-center justify-between px-3 md:px-5 z-[200] flex-shrink-0 shadow-lg">
        <div className="flex items-center gap-1 md:gap-2">
          <div className="flex bg-[var(--color-bg-tertiary)] rounded-lg p-0.5 shadow-inner border border-white/5">
             <button onClick={handleUndo} disabled={history.length === 0} className="p-1 md:p-1.5 rounded hover:bg-white/5 disabled:opacity-10 transition-all active:scale-90"><UndoIcon size={14} /></button>
             <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-1 md:p-1.5 rounded hover:bg-white/5 disabled:opacity-10 transition-all active:scale-90"><RedoIcon size={14} /></button>
          </div>
          <button onClick={() => canvasRef.current?.resetView()} className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-md text-[8px] md:text-[9px] font-black hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] uppercase tracking-widest border border-white/5 transition-all" title="Reset Viewport">
             <RotateCcw size={10} /> <span className="hidden sm:inline">Reset View</span>
          </button>
        </div>
        
        <h1 className="text-[10px] md:text-[11px] font-black tracking-[0.2em] md:tracking-[0.3em] uppercase opacity-90 flex items-center gap-2 truncate max-w-[200px] md:max-w-none">
          <span className="w-1 h-1 rounded-full bg-[hsl(var(--h),var(--s),var(--l))] shadow-[0_0_8px_currentColor]" />
          {currentProjectId ? savedProjects.find(p => p.id === currentProjectId)?.name : projectName}
        </h1>

        <div className="flex items-center gap-2">
          <button onClick={handleSaveProject} className="px-3 md:px-4 py-1.5 bg-white/5 text-white rounded-md text-[9px] font-black shadow-md hover:bg-white/10 active:scale-95 transition-all flex items-center gap-1.5 uppercase tracking-tight">
            <FileText size={12} /> <span className="hidden sm:inline">Save Project</span>
          </button>

          <button onClick={() => setIsSetupOpen(true)} className="px-3 md:px-4 py-1.5 bg-white/5 text-white rounded-md text-[9px] font-black shadow-md hover:bg-white/10 active:scale-95 transition-all flex items-center gap-1.5 uppercase tracking-tight">
            <RotateCcw size={12} /> <span className="hidden sm:inline">Studio Setup</span>
          </button>

          <button onClick={() => {
            const link = document.createElement('a');
            link.download = 'lumina_artwork.png';
            link.href = canvasRef.current?.getDataUrl() || '';
            link.click();
          }} className="px-3 md:px-4 py-1.5 bg-[hsl(var(--h),var(--s),var(--l))] text-white rounded-md text-[9px] font-black shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 uppercase tracking-tight">
            <Download size={12} /> <span className="hidden sm:inline">Export</span>
          </button>

          {isInstallable && (
            <button 
              onClick={handleInstallClick}
              className="px-3 md:px-4 py-1.5 bg-emerald-600 text-white rounded-md text-[9px] font-black shadow-md hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-1.5 uppercase tracking-tight animate-pulse"
            >
              <Smartphone size={12} /> <span className="hidden sm:inline">Install App</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <aside className="w-10 md:w-12 h-full bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] flex flex-col items-center relative z-[150] shadow-2xl flex-shrink-0">
          <Toolbar 
            currentTool={tool} setTool={setTool}
            color={color} setColor={setColor}
            swatches={swatches} setSwatches={setSwatches}
            settings={brushSettings} setSettings={setBrushSettings}
            onClear={() => { if(activeLayerId && confirm('Clear active layer?')) setHistory(h => h.filter(a => a.layerId !== activeLayerId)) }}
            onToggleLayers={() => setShowRightPanel(s => !s)}
            presets={allPresets}
            onApplyPreset={(p) => { setTool(p.tool); setBrushSettings(p.settings); }}
            onOpenCreator={() => setIsBrushCreatorOpen(true)}
          />
        </aside>
        
        <div className="flex-1 relative flex overflow-hidden bg-[#07080a]">
          <Canvas 
              ref={canvasRef}
              tool={tool} color={color} settings={brushSettings}
              layers={layers} activeLayerId={activeLayerId}
              history={history}
              onActionComplete={handleActionComplete}
              onCapture={(dataUrl) => {
                setBrushSettings(prev => ({
                  ...prev,
                  shape: 'custom',
                  brushTipData: dataUrl
                }));
                setTool('brush');
              }}
              width={canvasDimensions.width}
              height={canvasDimensions.height}
              backgroundColor={canvasBackgroundColor}
              gridSettings={gridSettings}
          />

          {!showRightPanel && (
            <button 
              onClick={() => setShowRightPanel(true)}
              className="absolute right-0 top-1/2 -translate-y-1/2 h-24 md:h-32 w-1.5 md:w-2 hover:w-6 bg-[hsl(var(--h),var(--s),var(--l),0.2)] hover:bg-[hsl(var(--h),var(--s),var(--l))] rounded-l-full z-[160] transition-all flex items-center justify-center group"
            >
              <ChevronLeft size={16} className="text-white opacity-0 group-hover:opacity-100 -translate-x-1" />
            </button>
          )}
        </div>

        <aside className={`h-full bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] flex flex-col shadow-[-15px_0_30px_rgba(0,0,0,0.4)] z-[150] transition-all duration-300 ease-in-out relative overflow-hidden flex-shrink-0 ${showRightPanel ? 'xl:w-[300px] lg:w-[280px] w-[260px] opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-12'}`}>
          <div className="grid grid-cols-5 h-10 flex-shrink-0 bg-[var(--color-bg-tertiary)]/30 border-b border-[var(--color-border)] min-w-[260px]">
            <TabTrigger active={rightPanelTab === 'colors'} onClick={() => setRightPanelTab('colors')} icon={<PaletteIcon size={12} />} label="Palette" />
            <TabTrigger active={rightPanelTab === 'layers'} onClick={() => setRightPanelTab('layers')} icon={<LayersIcon size={12} />} label="Layers" />
            <TabTrigger active={rightPanelTab === 'brush'} onClick={() => setRightPanelTab('brush')} icon={<Settings2 size={12} />} label="Brush" />
            <TabTrigger active={rightPanelTab === 'frames'} onClick={() => setRightPanelTab('frames')} icon={<Layout size={12} />} label="Frames" />
            <TabTrigger active={rightPanelTab === 'blueprint'} onClick={() => setRightPanelTab('blueprint')} icon={<Compass size={12} />} label="Draft" />
          </div>

          <div className="flex-1 min-h-0 overflow-hidden relative min-w-[260px]">
            {rightPanelTab === 'colors' && (
              <ColorPanel 
                color={color} 
                setColor={setColor} 
                swatches={swatches} 
                setSwatches={setSwatches} 
                savedPalettes={savedPalettes}
                onSavePalette={handleSavePaletteCollection}
                onRestorePalette={handleRestorePalette}
                onDeletePalette={handleDeletePalette}
              />
            )}
            {rightPanelTab === 'layers' && (
              <LayersPanel
                layers={layers} activeLayerId={activeLayerId}
                history={history}
                canvasWidth={canvasDimensions.width}
                canvasHeight={canvasDimensions.height}
                onSelectLayer={setActiveLayerId} 
                onAddLayer={() => setLayers(p => [...p, createNewLayer(`Layer ${p.length + 1}`)])}
                onDeleteLayer={(id) => { setLayers(p => p.filter(l => l.id !== id)); setHistory(h => h.filter(a => a.layerId !== id)); }}
                onToggleVisibility={(id) => setLayers(p => p.map(l => l.id === id ? { ...l, isVisible: !l.isVisible } : l))}
                onToggleLock={(id) => setLayers(p => p.map(l => l.id === id ? { ...l, isLocked: !l.isLocked } : l))}
                onRenameLayer={(id, name) => setLayers(p => p.map(l => l.id === id ? { ...l, name } : l))}
                onReorderLayer={(id, dir) => {
                  const idx = layers.findIndex(l => l.id === id);
                  const next = dir === 'up' ? idx + 1 : idx - 1;
                  if (next < 0 || next >= layers.length) return;
                  const n = [...layers]; [n[idx], n[next]] = [n[next], n[idx]]; setLayers(n);
                }}
                onOpacityChange={(id, o) => setLayers(p => p.map(l => l.id === id ? { ...l, opacity: o } : l))}
                onBlendChange={(id, b) => setLayers(p => p.map(l => l.id === id ? { ...l, blendMode: b } : l))}
                onAlphaLockToggle={(id) => setLayers(p => p.map(l => l.id === id ? { ...l, isAlphaLocked: !l.isAlphaLocked } : l))}
                onClippingToggle={(id) => setLayers(p => p.map(l => l.id === id ? { ...l, isClippingMask: !l.isClippingMask } : l))}
                onMergeDown={handleMergeDown}
                backgroundColor={canvasBackgroundColor}
                onBackgroundColorChange={setCanvasBackgroundColor}
              />
            )}
            {rightPanelTab === 'brush' && (
              <div className="flex flex-col h-full bg-[var(--color-bg-secondary)] overflow-y-auto custom-scrollbar p-3 md:p-5 space-y-4 md:space-y-6 min-w-[260px]">
                <div className="flex flex-col gap-3 bg-[var(--color-bg-tertiary)]/20 p-3 md:p-4 rounded-xl border border-white/5 shadow-inner">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Brush Tip Shape</span>
                  <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => setBrushSettings({...brushSettings, shape: 'round'})} className={`flex items-center justify-center gap-1.5 py-1.5 md:py-2 rounded-lg border transition-all ${brushSettings.shape === 'round' ? 'bg-[hsl(var(--h),var(--s),var(--l))] text-white border-transparent shadow-md' : 'bg-black/20 border-white/5 opacity-50'}`}><Circle size={12} /><span className="text-[9px] font-black uppercase">Round</span></button>
                     <button onClick={() => setBrushSettings({...brushSettings, shape: 'textured'})} className={`flex items-center justify-center gap-1.5 py-1.5 md:py-2 rounded-lg border transition-all ${brushSettings.shape === 'textured' ? 'bg-[hsl(var(--h),var(--s),var(--l))] text-white border-transparent shadow-md' : 'bg-black/20 border-white/5 opacity-50'}`}><ImageIcon size={12} /><span className="text-[9px] font-black uppercase">Texture</span></button>
                  </div>
                </div>

                <BrushSlider label="Size" value={brushSettings.size} unit="px" min={1} max={500} onChange={v => setBrushSettings({...brushSettings, size: v})} />
                <BrushSlider label="Flow" value={Math.round(brushSettings.flow * 100)} unit="%" min={0} max={100} onChange={v => setBrushSettings({...brushSettings, flow: v / 100})} />
                <BrushSlider label="Hardness" value={Math.round(brushSettings.hardness * 100)} unit="%" min={0} max={100} onChange={v => setBrushSettings({...brushSettings, hardness: v / 100})} />
                
                <div className="h-px bg-white/5 my-1 md:my-2" />
                <div className="flex flex-col gap-3 bg-[var(--color-bg-tertiary)]/20 p-3 md:p-4 rounded-xl border border-white/5 shadow-inner">
                   <div className="flex items-center gap-2 mb-1">
                      <Wind size={10} className="text-[hsl(var(--h),var(--s),var(--l))]" />
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Stroke Smoothing</span>
                   </div>
                   <BrushSlider label="Stabilization" value={Math.round(brushSettings.stabilization * 100)} unit="%" min={0} max={100} onChange={v => setBrushSettings({...brushSettings, stabilization: v / 100})} />
                   <BrushSlider label="Aggression" value={Math.round(brushSettings.smoothingAggression * 100)} unit="%" min={0} max={100} onChange={v => setBrushSettings({...brushSettings, smoothingAggression: v / 100})} />
                   <BrushSlider label="Delay / Rope" value={brushSettings.smoothingDelay} unit="px" min={0} max={500} onChange={v => setBrushSettings({...brushSettings, smoothingDelay: v})} />
                </div>

                <div className="h-px bg-white/5 my-1 md:my-2" />
                <div className="flex flex-col gap-3 bg-[var(--color-bg-tertiary)]/20 p-3 md:p-4 rounded-xl border border-white/5 shadow-inner">
                   <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={10} className="text-[hsl(var(--h),var(--s),var(--l))]" />
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Texture Dynamics</span>
                   </div>
                   <BrushSlider label="Scattering" value={Math.round(brushSettings.jitter * 100)} unit="%" min={0} max={200} onChange={v => setBrushSettings({...brushSettings, jitter: v / 100})} />
                   <BrushSlider label="Angle Jitter" value={Math.round(brushSettings.angleJitter * 100)} unit="%" min={0} max={100} onChange={v => setBrushSettings({...brushSettings, angleJitter: v / 100})} />
                   <BrushSlider label="Size Jitter" value={Math.round(brushSettings.sizeJitter * 100)} unit="%" min={0} max={100} onChange={v => setBrushSettings({...brushSettings, sizeJitter: v / 100})} />
                </div>

                <div className="h-px bg-white/5 my-1 md:my-2" />
                <div className="flex flex-col gap-3 bg-[var(--color-bg-tertiary)]/20 p-3 md:p-4 rounded-xl border border-white/5 shadow-inner">
                   <div className="flex items-center gap-2 mb-1">
                      <Zap size={10} className="text-[hsl(var(--h),var(--s),var(--l))]" />
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Pressure Response</span>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setBrushSettings({...brushSettings, pressureSize: !brushSettings.pressureSize})} className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[8px] font-black uppercase transition-all ${brushSettings.pressureSize ? 'bg-[hsl(var(--h),var(--s),var(--l))] text-white' : 'bg-black/20 text-white/30 border-white/5'}`}>Size</button>
                      <button onClick={() => setBrushSettings({...brushSettings, pressureOpacity: !brushSettings.pressureOpacity})} className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[8px] font-black uppercase transition-all ${brushSettings.pressureOpacity ? 'bg-[hsl(var(--h),var(--s),var(--l))] text-white' : 'bg-black/20 text-white/30 border-white/5'}`}>Opacity</button>
                   </div>
                   <BrushSlider label="Pressure Curve" value={brushSettings.pressureCurve.toFixed(1)} unit="" min={0.5} max={3.0} step={0.1} onChange={v => setBrushSettings({...brushSettings, pressureCurve: v})} />
                </div>

                <div className="h-px bg-white/5 my-1 md:my-2" />
                <div className="flex flex-col gap-3 bg-[var(--color-bg-tertiary)]/20 p-3 md:p-4 rounded-xl border border-white/5 shadow-inner">
                   <div className="flex items-center gap-2 mb-1">
                      <Maximize size={10} className="text-[hsl(var(--h),var(--s),var(--l))]" />
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Live Capture Engine</span>
                   </div>
                   <button 
                     onClick={() => setTool('capture')} 
                     className={`w-full py-2 rounded-lg border text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 ${tool === 'capture' ? 'bg-[hsl(var(--h),var(--s),var(--l))] text-white border-transparent' : 'bg-black/20 border-white/5 opacity-50 hover:opacity-100'}`}
                   >
                     <Maximize size={14} /> {tool === 'capture' ? 'Selecting Area...' : 'Capture New Tip'}
                   </button>
                   {brushSettings.brushTipData && (
                     <div className="flex flex-col gap-2">
                       <div className="flex items-center gap-2 p-2 bg-black/40 rounded-lg border border-white/5">
                         <img src={brushSettings.brushTipData} className="w-10 h-10 object-contain bg-white/5 rounded border border-white/10" />
                         <div className="flex flex-col">
                           <span className="text-[7px] font-black uppercase opacity-40">Active Captured Tip</span>
                           <button onClick={() => setBrushSettings({...brushSettings, shape: 'round', brushTipData: undefined})} className="text-[7px] font-bold text-red-400 uppercase hover:underline">Reset to Round</button>
                         </div>
                       </div>
                       <BrushSlider label="Tip Spacing" value={brushSettings.spacing} unit="" min={0.01} max={1.0} step={0.01} onChange={v => setBrushSettings({...brushSettings, spacing: v})} />
                     </div>
                   )}
                </div>
              </div>
            )}
            {rightPanelTab === 'frames' && (
              <div className="flex flex-col h-full bg-[var(--color-bg-secondary)] overflow-y-auto custom-scrollbar p-3 md:p-5 space-y-4 md:space-y-6 min-w-[260px]">
                <div className="flex flex-col gap-1">
                   <h2 className="text-[11px] font-black uppercase tracking-widest text-[hsl(var(--h),var(--s),var(--l))]">Strip Templates</h2>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                   <StripTemplateBtn onClick={() => generateComicFrames('4koma')} icon={<Tally4 size={14} />} label="4-Koma" desc="Vertical strip" />
                   <StripTemplateBtn onClick={() => generateComicFrames('daily')} icon={<Columns size={14} />} label="Daily" desc="3-panel horizontal" />
                   <StripTemplateBtn onClick={() => generateComicFrames('sunday')} icon={<Grid3X3 size={14} />} label="Sunday" desc="2x3 full page" />
                   <StripTemplateBtn onClick={() => generateComicFrames('action')} icon={<Rows size={14} />} label="Action" desc="2x2 cinematic" />
                </div>

                <div className="h-px bg-white/5 my-2" />
                <div className="flex flex-col gap-1">
                   <h2 className="text-[11px] font-black uppercase tracking-widest text-[hsl(var(--h),var(--s),var(--l))]">Custom Grid</h2>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                     <BrushSlider label="Rows" value={frameRows} unit="" min={1} max={10} onChange={setFrameRows} />
                     <BrushSlider label="Cols" value={frameCols} unit="" min={1} max={10} onChange={setFrameCols} />
                  </div>
                  <BrushSlider label="Gutter" value={frameGutter} unit="px" min={0} max={200} onChange={setFrameGutter} />
                  <BrushSlider label="Margin" value={frameMargin} unit="px" min={0} max={300} onChange={setFrameMargin} />
                  <BrushSlider label="Weight" value={frameThickness} unit="px" min={1} max={20} onChange={setFrameThickness} />
                </div>
                <button onClick={() => generateComicFrames()} className="w-full py-3 bg-[hsl(var(--h),var(--s),var(--l))] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2">
                   <Layout size={14} /> Generate Custom
                </button>
              </div>
            )}
            {rightPanelTab === 'blueprint' && (
              <div className="flex flex-col h-full bg-[var(--color-bg-secondary)] overflow-y-auto custom-scrollbar p-3 md:p-5 space-y-4 md:space-y-6 min-w-[260px]">
                <div className="flex flex-col gap-1">
                   <h2 className="text-[11px] font-black uppercase tracking-widest text-[hsl(var(--h),var(--s),var(--l))]">Blueprint Mode</h2>
                </div>

                <button 
                  onClick={handleApplyBlueprintTheme}
                  className="w-full py-4 bg-blue-900 text-white rounded-xl border border-blue-400/30 flex flex-col items-center gap-1 shadow-xl hover:brightness-110 transition-all"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">Activate Blueprint Theme</span>
                  <span className="text-[7px] font-bold opacity-50 uppercase">Blue Background • White Lines • Grid Snap</span>
                </button>

                <div className="h-px bg-white/5 my-2" />
                
                <div className="flex flex-col gap-3 bg-[var(--color-bg-tertiary)]/20 p-3 md:p-4 rounded-xl border border-white/5 shadow-inner">
                   <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Grid Type</span>
                   <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setGridSettings({...gridSettings, type: 'none'})} className={`py-2 rounded-lg border text-[8px] font-black uppercase transition-all ${gridSettings.type === 'none' ? 'bg-[hsl(var(--h),var(--s),var(--l))] text-white border-transparent' : 'bg-black/20 border-white/5 opacity-50'}`}>None</button>
                      <button onClick={() => setGridSettings({...gridSettings, type: 'square'})} className={`py-2 rounded-lg border text-[8px] font-black uppercase transition-all ${gridSettings.type === 'square' ? 'bg-[hsl(var(--h),var(--s),var(--l))] text-white border-transparent' : 'bg-black/20 border-white/5 opacity-50'}`}>Square</button>
                      <button onClick={() => setGridSettings({...gridSettings, type: 'isometric'})} className={`py-2 rounded-lg border text-[8px] font-black uppercase transition-all ${gridSettings.type === 'isometric' ? 'bg-[hsl(var(--h),var(--s),var(--l))] text-white border-transparent' : 'bg-black/20 border-white/5 opacity-50'}`}>Isometric</button>
                      <button onClick={() => setGridSettings({...gridSettings, type: 'blueprint'})} className={`py-2 rounded-lg border text-[8px] font-black uppercase transition-all ${gridSettings.type === 'blueprint' ? 'bg-[hsl(var(--h),var(--s),var(--l))] text-white border-transparent' : 'bg-black/20 border-white/5 opacity-50'}`}>Blueprint</button>
                   </div>
                </div>

                <BrushSlider label="Grid Size" value={gridSettings.size} unit="px" min={10} max={200} onChange={v => setGridSettings({...gridSettings, size: v})} />
                <BrushSlider label="Grid Opacity" value={Math.round(gridSettings.opacity * 100)} unit="%" min={0} max={100} onChange={v => setGridSettings({...gridSettings, opacity: v / 100})} />
                
                <button 
                  onClick={() => setGridSettings({...gridSettings, snap: !gridSettings.snap})}
                  className={`w-full py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${gridSettings.snap ? 'bg-green-600 text-white border-transparent' : 'bg-black/20 border-white/5 opacity-50'}`}
                >
                  <Hash size={14} /> Snap to Grid: {gridSettings.snap ? 'ON' : 'OFF'}
                </button>

                <div className="h-px bg-white/5 my-2" />
                <div className="flex flex-col gap-1">
                   <h2 className="text-[11px] font-black uppercase tracking-widest text-[hsl(var(--h),var(--s),var(--l))]">Drafting Tools</h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <ToolBtnSmall active={tool === 'line'} onClick={() => setTool('line')} icon={<PenTool size={14} />} label="Line" />
                   <ToolBtnSmall active={tool === 'rect'} onClick={() => setTool('rect')} icon={<Box size={14} />} label="Rectangle" />
                   <ToolBtnSmall active={tool === 'circle'} onClick={() => setTool('circle')} icon={<Circle size={14} />} label="Circle" />
                   <ToolBtnSmall active={tool === 'measure'} onClick={() => setTool('measure')} icon={<RulerIcon size={14} />} label="Dimension" />
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setShowRightPanel(false)} className="absolute -left-2.5 top-1/2 -translate-y-1/2 z-[401] bg-[var(--color-bg-secondary)] p-1 rounded-full border border-[var(--color-border)] shadow-xl hover:scale-110 transition-all group">
            <ChevronRight size={12} className="group-hover:text-[hsl(var(--h),var(--s),var(--l))]" />
          </button>
        </aside>
      </div>

      {isBrushCreatorOpen && (
        <BrushCreator 
          onClose={() => setIsBrushCreatorOpen(false)} 
          onSave={handleSaveBrush} 
          initialSettings={brushSettings} 
          accentColor={accent}
        />
      )}
    </main>
  );
};

const StripTemplateBtn = ({ onClick, icon, label, desc }: any) => (
  <button onClick={onClick} className="flex flex-col gap-1.5 p-3 rounded-xl bg-black/20 border border-white/5 hover:border-[hsl(var(--h),var(--s),var(--l))] hover:bg-[hsl(var(--h),var(--s),var(--l),0.05)] transition-all group text-left">
     <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[hsl(var(--h),var(--s),var(--l))] group-hover:scale-110 transition-transform">
        {icon}
     </div>
     <div className="flex flex-col">
        <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
        <span className="text-[7px] font-bold opacity-30 leading-none">{desc}</span>
     </div>
  </button>
);

const TabTrigger = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 transition-all border-b-2 flex-1 h-full ${active ? 'bg-[var(--color-bg-secondary)] border-[hsl(var(--h),var(--s),var(--l))] text-[hsl(var(--h),var(--s),var(--l))]' : 'border-transparent opacity-30 hover:opacity-100 hover:bg-white/5'}`}>
    {icon}
    <span className="text-[7px] font-black uppercase tracking-[0.2em] hidden xs:inline">{label}</span>
  </button>
);

const ToolBtnSmall = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[9px] font-black uppercase transition-all ${active ? 'bg-[hsl(var(--h),var(--s),var(--l))] text-white border-transparent shadow-md' : 'bg-black/20 border-white/5 opacity-50 hover:opacity-100'}`}>
    {icon} {label}
  </button>
);

const BrushSlider = ({ label, value, unit, min, max, onChange }: any) => (
  <div className="flex flex-col gap-2 group bg-[var(--color-bg-tertiary)]/20 p-3 md:p-4 rounded-xl border border-white/5 shadow-inner hover:bg-[var(--color-bg-tertiary)]/40 transition-colors">
    <div className="flex justify-between items-end px-0.5">
      <span className="text-[8px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">{label}</span>
      <span className="text-[10px] font-mono font-black text-[hsl(var(--h),var(--s),var(--l))]">{value}{unit}</span>
    </div>
    <div className="relative h-1.5 flex items-center">
       <input type="range" min={min} max={max} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full h-1 bg-black/40 rounded-full appearance-none accent-white cursor-pointer" />
    </div>
  </div>
);

export default App;
