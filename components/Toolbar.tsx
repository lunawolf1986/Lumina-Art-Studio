
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Pencil, Palette as PaletteIcon, Eraser, Trash2, X, Bookmark, Plus, Lasso, Move, Hand, 
  Filter, ChevronDown, Layers, Book, Droplets, Sparkles, Image as ImageIcon, Grid, Zap, Cloud, Brush, Feather, Wand2, Layout, Ruler, Compass
} from 'lucide-react';
import { Tool, BrushSettings, BrushPreset, Point } from '../types';

interface ToolbarProps {
  currentTool: Tool;
  setTool: (tool: Tool) => void;
  color: string;
  setColor: (color: string) => void;
  swatches: string[];
  setSwatches: React.Dispatch<React.SetStateAction<string[]>>;
  settings: BrushSettings;
  setSettings: (settings: BrushSettings) => void;
  onClear: () => void;
  onToggleLayers: () => void;
  presets: BrushPreset[];
  onApplyPreset: (preset: BrushPreset) => void;
  onOpenCreator: () => void;
}

const WavyStrokePreview: React.FC<{ settings: BrushSettings; color: string; isActive: boolean }> = ({ settings, color, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const { size, hardness, flow, shape, brushTipData, spacing: spacingMult } = settings;
    const previewSize = Math.max(2, Math.min(12, size / 4));
    const spacing = Math.max(0.5, previewSize * spacingMult);
    
    ctx.save();
    
    const width = canvas.width;
    const height = canvas.height;
    
    const renderStep = (x: number, y: number, currentFlow: number, currentSize: number) => {
      ctx.globalAlpha = currentFlow;
      if (shape === 'custom' && brushTipData) {
        const img = new Image();
        img.src = brushTipData;
        if (img.complete) {
          ctx.drawImage(img, x - currentSize / 2, y - currentSize / 2, currentSize, currentSize);
          ctx.globalCompositeOperation = 'source-in';
          ctx.fillStyle = isActive ? '#ff9d00' : '#ffffff';
          ctx.fillRect(x - currentSize / 2, y - currentSize / 2, currentSize, currentSize);
          ctx.globalCompositeOperation = 'source-over';
        }
      } else {
        const fill = isActive ? '#ff9d00' : '#ffffff';
        if (hardness >= 0.9) {
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.arc(x, y, currentSize / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const grad = ctx.createRadialGradient(x, y, (currentSize / 2) * hardness, x, y, currentSize / 2);
          grad.addColorStop(0, fill);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, currentSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    for (let x = 10; x < width - 10; x += spacing) {
      const t = (x - 10) / (width - 20);
      const waveY = height / 2 + Math.sin(t * Math.PI * 2) * (height / 4);
      
      const pressureFlow = flow * (0.3 + 0.7 * Math.sin(t * Math.PI));
      const pressureSize = previewSize * (0.8 + 0.4 * Math.sin(t * Math.PI));
      
      renderStep(x, waveY, pressureFlow, pressureSize);
    }

    ctx.restore();
  }, [settings, color, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      width={140} 
      height={32} 
      className="w-full h-8 opacity-90"
    />
  );
};

const BrushTipPreview: React.FC<{ settings: BrushSettings; isActive: boolean }> = ({ settings, isActive }) => {
  const { shape, hardness, brushTipData } = settings;
  const colorClass = isActive ? 'bg-[#ff9d00]' : 'bg-white';
  
  if (shape === 'custom' && brushTipData) {
    return (
      <div className="w-8 h-8 flex items-center justify-center opacity-60">
        <img src={brushTipData} className={`max-w-full max-h-full grayscale invert ${isActive ? 'brightness-150 sepia(1) saturate(100) hue-rotate(30deg)' : ''}`} />
      </div>
    );
  }

  const sizeStyle = { transform: `scale(${0.2 + hardness * 0.8})` };
  
  return (
    <div className="w-8 h-8 flex items-center justify-center">
      <div className={`w-3 h-3 rounded-full ${colorClass} shadow-[0_0_8px_rgba(255,255,255,0.2)]`} style={sizeStyle} />
    </div>
  );
};

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'Anime': return <Wand2 size={12} />;
    case 'Pencils': return <Pencil size={12} />;
    case 'Pens': return <Feather size={12} />;
    case 'Sargent': return <PaletteIcon size={12} />;
    case 'Watercolor': return <Droplets size={12} />;
    case 'Sumi-e': return <Brush size={12} />;
    case 'Thick Paint': return <Layers size={12} />;
    case 'Pattern Pens': return <Grid size={12} />;
    case 'Pastels': return <Cloud size={12} />;
    case 'Blueprint': return <Compass size={12} />;
    default: return <Book size={12} />;
  }
};

const Toolbar: React.FC<ToolbarProps> = ({
  currentTool, setTool, color, setColor, swatches, setSwatches, settings, setSettings, 
  onClear, presets, onApplyPreset, onOpenCreator
}) => {
  const [showPresets, setShowPresets] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Anime');

  const categories = useMemo(() => {
    const cats = new Set(presets.map(p => p.category));
    return Array.from(cats).sort();
  }, [presets]);

  const filteredPresets = useMemo(() => {
    return presets.filter(p => p.category === selectedCategory);
  }, [presets, selectedCategory]);

  return (
    <div className="flex flex-col items-center gap-2 md:gap-3 p-1.5 h-full bg-[#1e1e1e] w-full flex-shrink-0 shadow-inner">
      <div className="flex flex-col gap-1.5 md:gap-2 w-full items-center py-2 md:py-4">
        <ToolBtn active={currentTool === 'pan'} onClick={() => setTool('pan')} icon={<Hand size={18} />} label="Pan Tool" />
        <ToolBtn active={currentTool === 'pen'} onClick={() => setTool('pen')} icon={<Pencil size={18} />} label="Pen Tool" />
        <ToolBtn active={currentTool === 'transform'} onClick={() => setTool('transform')} icon={<Move size={18} />} label="Transform" />
        <ToolBtn active={currentTool === 'lasso'} onClick={() => setTool('lasso')} icon={<Lasso size={18} />} label="Lasso Selection" />
        <ToolBtn active={currentTool === 'frame'} onClick={() => setTool('frame')} icon={<Layout size={18} />} label="Comic Frames" />
        <ToolBtn active={currentTool === 'ruler'} onClick={() => setTool('ruler')} icon={<Ruler size={18} />} label="Ruler Guide" />
        <ToolBtn active={currentTool === 'line'} onClick={() => setTool('line')} icon={<Compass size={18} />} label="Line Tool" />
        <ToolBtn active={currentTool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser size={18} />} label="Eraser" />
        <div className="h-px w-8 bg-white/5 my-0.5 md:my-1" />
        <ToolBtn active={showPresets} onClick={() => setShowPresets(!showPresets)} icon={<Bookmark size={18} />} label="Brush Presets" />
        <ToolBtn active={false} onClick={onOpenCreator} icon={<Wand2 size={18} />} label="Brush Architect" />
      </div>
      
      <div className="mt-auto flex flex-col gap-2 md:gap-3 py-2 md:py-4 items-center">
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg border border-white/10 shadow-lg relative overflow-hidden flex items-center justify-center group" style={{ backgroundColor: color }}>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer scale-150" />
        </div>
        <ToolBtn onClick={onClear} icon={<Trash2 size={18} className="text-red-500/50" />} label="Clear Layer" />
      </div>

      {showPresets && (
          <div className="fixed left-12 md:left-14 top-2 bottom-2 md:top-4 md:bottom-4 bg-[#1a1a1a] rounded-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] w-[320px] sm:w-[380px] md:w-[480px] z-[400] animate-in flex flex-col overflow-hidden text-[#e0e0e0] font-sans">
              <div className="h-10 bg-[#252525] border-b border-white/5 flex items-center justify-between px-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                   <button onClick={() => setShowPresets(false)} className="hover:text-white"><X size={14} /></button>
                   <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-tight opacity-80">Brush Selector</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-20 md:w-32 h-6 bg-black/40 rounded border border-white/5" />
                   <button className="opacity-40 hover:opacity-100"><Filter size={14} /></button>
                </div>
              </div>

              <div className="p-2 md:p-3 bg-[#2d2d2d] border-b border-black/20 flex items-center gap-2 md:gap-3 flex-shrink-0">
                 <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/10 border border-blue-500/20 rounded-md flex items-center justify-center">
                    <PaletteIcon size={16} md:size={20} className="text-blue-400" />
                 </div>
                 <span className="text-[10px] md:text-[12px] font-bold text-gray-300 truncate">Lumina Anime Collection</span>
                 <div className="ml-auto flex items-center gap-3">
                    <ChevronDown size={14} md:size={16} className="text-gray-400 hover:text-white cursor-pointer -rotate-90" />
                 </div>
              </div>

              <div className="px-2 md:px-3 py-1.5 md:py-2 bg-[#1a1a1a] flex items-center gap-2 flex-shrink-0">
                 <span className="text-[9px] md:text-[10px] text-gray-500 hidden sm:inline">Library:</span>
                 <button className="flex-1 h-7 px-2 bg-[#2a2a2a] border border-white/10 rounded flex items-center justify-between text-[10px] md:text-[11px]">
                    <span className="font-bold truncate">Studio Standard V2</span>
                    <ChevronDown size={12} />
                 </button>
              </div>

              <div className="flex-1 flex min-h-0">
                  <div className="w-[100px] sm:w-[140px] md:w-[180px] bg-[#222222] border-r border-black/40 overflow-y-auto custom-scrollbar">
                      {categories.map(cat => (
                          <button 
                            key={cat} 
                            onClick={() => setSelectedCategory(cat)}
                            className={`w-full text-left px-2 md:px-3 py-2 text-[10px] md:text-[11px] flex items-center gap-2 border-l-2 transition-all ${selectedCategory === cat ? 'bg-[#333333] border-blue-400 font-bold text-white' : 'border-transparent text-gray-400 hover:bg-white/5'}`}
                          >
                             <div className="w-3.5 h-3.5 md:w-4 md:h-4 flex items-center justify-center opacity-70">
                                <CategoryIcon category={cat} />
                             </div>
                             <span className="truncate">{cat}</span>
                          </button>
                      ))}
                  </div>

                  <div className="flex-1 bg-[#1a1a1a] overflow-y-auto custom-scrollbar p-1 flex flex-col gap-0.5">
                      {filteredPresets.map(p => {
                          const isActive = settings.size === p.settings.size && settings.hardness === p.settings.hardness && p.tool === currentTool;
                          return (
                            <button 
                              key={p.id} 
                              onClick={() => { onApplyPreset(p); }} 
                              className={`flex flex-col p-1 transition-all text-left relative group border ${isActive ? 'bg-[#2a2a2a] border-amber-600/50' : 'border-transparent hover:bg-white/5'}`}
                            >
                                <div className="flex items-center h-8 md:h-10">
                                   <BrushTipPreview settings={p.settings} isActive={isActive} />
                                   <div className="flex-1 relative overflow-hidden h-full flex items-center px-1">
                                      <WavyStrokePreview settings={p.settings} color={color} isActive={isActive} />
                                   </div>
                                </div>
                                <span className={`text-[9px] md:text-[10px] pl-6 md:pl-8 pb-0.5 md:pb-1 transition-colors ${isActive ? 'text-amber-500 font-bold' : 'text-gray-400'}`}>{p.name}</span>
                                
                                {isActive && <div className="absolute inset-0 ring-1 ring-amber-500/30 pointer-events-none" />}
                            </button>
                          );
                      })}
                  </div>
              </div>

              <div className="bg-[#222222] p-2 border-t border-black/40 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-1.5 md:gap-2">
                     <span className="text-[9px] md:text-[10px] text-gray-500 hidden xs:inline">Engine:</span>
                     <span className="text-[9px] md:text-[10px] font-bold text-gray-300">Lumina Core 2.5</span>
                  </div>
                  <div className="flex gap-2 opacity-60">
                     <Layers size={14} />
                     <Layers size={14} className="text-amber-600" />
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const ToolBtn = ({ active = false, onClick, icon, label }: any) => (
  <button onClick={onClick} title={label} className={`w-8 h-8 md:w-9 md:h-9 flex-shrink-0 flex items-center justify-center rounded-lg transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}> {icon} </button>
);

export default Toolbar;
