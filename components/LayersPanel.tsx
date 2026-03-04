
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Layer, BlendMode, DrawingAction, Point } from '../types';
import { Layers, Plus, Trash2, Eye, EyeOff, Lock, Unlock, Link, CornerRightDown, Monitor, Palette, ShieldCheck, Square } from 'lucide-react';

interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string | null;
  history: DrawingAction[];
  canvasWidth: number;
  canvasHeight: number;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRenameLayer: (id: string, name: string) => void;
  onReorderLayer: (id: string, direction: 'up' | 'down') => void;
  onOpacityChange: (id: string, opacity: number) => void;
  onBlendChange: (id: string, blendMode: BlendMode) => void;
  onAlphaLockToggle: (id: string) => void;
  onClippingToggle: (id: string) => void;
  onMergeDown: () => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
}

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'source-over', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'lighter', label: 'Add' },
];

/**
 * Renders a miniature preview of a single layer's content.
 */
const LayerThumbnail: React.FC<{
  layerId: string;
  history: DrawingAction[];
  width: number;
  height: number;
}> = ({ layerId, history, width, height }) => {
  const thumbRef = useRef<HTMLCanvasElement>(null);

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

  const renderAction = useCallback((ctx: CanvasRenderingContext2D, action: DrawingAction, scale: number) => {
    if (action.points.length < 1) return;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.globalCompositeOperation = action.tool === 'eraser' ? 'destination-out' : 'source-over';

    const { 
      size, hardness, flow, shape, 
      thicknessStart = 1, thicknessEnd = 1, 
      opacityStart = 1, opacityEnd = 1,
      fadeLengthStart = 0.2, fadeLengthEnd = 0.2, fadeShape = 0.5,
      pressureSize = true, pressureOpacity = true, pressureCurve = 1.0
    } = action.settings;
    
    const spacing = Math.max(0.5, size * (action.settings.spacing || 0.05));
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
      } else {
        if (fadeLengthStart === 0 && fadeLengthEnd === 0) {
          taperSizeMult = thicknessStart + (thicknessEnd - thicknessStart) * progress;
          taperAlphaMult = opacityStart + (opacityEnd - opacityStart) * progress;
        }
      }

      let pressureValue = p.pressure ?? 1.0;
      if (pressureValue > 0) pressureValue = Math.pow(pressureValue, 1 / pressureCurve);

      const currentSize = size * taperSizeMult * (pressureSize ? pressureValue : 1.0);
      const currentFlow = flow * taperAlphaMult * (pressureOpacity ? pressureValue : 1.0);
      
      const prev = action.points[i-1] || p;
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const steps = Math.ceil(dist / spacing);
      
      for(let s = 0; s <= steps; s++) {
        const tStep = s / (steps || 1);
        const tx = prev.x + dx * tStep;
        const ty = prev.y + dy * tStep;
        
        if (hardness >= 0.95) {
          ctx.fillStyle = action.color;
          ctx.globalAlpha = Math.max(0, currentFlow);
          ctx.beginPath();
          ctx.arc(tx, ty, Math.max(0.1, currentSize / 2), 0, Math.PI * 2);
          ctx.fill();
        } else {
          const grad = ctx.createRadialGradient(tx, ty, (currentSize / 2) * hardness, tx, ty, currentSize / 2);
          grad.addColorStop(0, action.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.globalAlpha = Math.max(0, currentFlow);
          ctx.beginPath();
          ctx.arc(tx, ty, Math.max(0.1, currentSize / 2), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    ctx.restore();
  }, []);

  useEffect(() => {
    const canvas = thumbRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / width, canvas.height / height);
    
    const layerHistory = history.filter(a => a.layerId === layerId);
    layerHistory.forEach(action => renderAction(ctx, action, scale));
  }, [history, layerId, width, height, renderAction]);

  return (
    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded border border-white/10 overflow-hidden flex-shrink-0 relative shadow-inner">
      <div 
        className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #000 25%, transparent 25%), 
            linear-gradient(-45deg, #000 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #000 75%), 
            linear-gradient(-45deg, transparent 75%, #000 75%)
          `,
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 0 4px, 4px 4px, 4px 0'
        }}
      />
      <canvas 
        ref={thumbRef} 
        width={64} 
        height={64} 
        className="absolute inset-0 z-10 w-full h-full object-contain"
      />
    </div>
  );
};

const LayersPanel: React.FC<LayersPanelProps> = ({
  layers, activeLayerId, history, canvasWidth, canvasHeight, onSelectLayer, onAddLayer, onDeleteLayer, onToggleVisibility, onToggleLock, onRenameLayer, onOpacityChange, onBlendChange, onAlphaLockToggle, onClippingToggle, onMergeDown, backgroundColor, onBackgroundColorChange
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  const startEditing = (e: React.MouseEvent, layer: Layer) => {
    e.stopPropagation();
    setEditingId(layer.id);
    setTempName(layer.name);
  };

  const saveName = (id: string) => {
    if (tempName.trim()) onRenameLayer(id, tempName.trim());
    setEditingId(null);
  };

  const displayLayers = [...layers].reverse();

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-bg-secondary)] overflow-hidden">
      {/* Panel Header */}
      <div className="p-2.5 border-b border-[var(--color-border)] flex items-center justify-between flex-shrink-0 bg-[var(--color-bg-secondary)] z-10">
        <div className="flex items-center gap-1.5">
          <Layers size={12} className="text-[hsl(var(--h),var(--s),var(--l))]" />
          <h3 className="text-[9px] font-bold uppercase tracking-wider">Layers</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={onMergeDown} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-secondary)]" title="Merge Down"><CornerRightDown size={12} /></button>
          <button onClick={onAddLayer} className="p-1 bg-[hsl(var(--h),var(--s),var(--l))] text-white rounded shadow-sm" title="New Layer"><Plus size={12} /></button>
        </div>
      </div>

      {/* Layer List Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 flex flex-col gap-1 min-h-0">
        {displayLayers.map((layer, index) => (
          <div 
            key={layer.id} 
            onClick={() => onSelectLayer(layer.id)} 
            className={`group flex flex-col gap-0.5 p-1.5 rounded-lg border transition-all cursor-pointer ${activeLayerId === layer.id ? 'bg-[hsla(var(--h),var(--s),var(--l),0.06)] border-[hsl(var(--h),var(--s),var(--l),0.2)]' : 'border-transparent hover:bg-[var(--color-bg-tertiary)]'}`}
          >
            <div className="flex items-center gap-2 md:gap-3">
              <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }} className="p-0.5 hover:bg-black/10 rounded transition-colors flex-shrink-0">
                {layer.isVisible ? <Eye size={10} /> : <EyeOff size={10} className="opacity-30" />}
              </button>
              
              <LayerThumbnail 
                layerId={layer.id} 
                history={history} 
                width={canvasWidth} 
                height={canvasHeight} 
              />
              
              <div className="flex-1 flex items-center gap-1 min-w-0">
                {layer.isClippingMask && <CornerRightDown size={8} className="text-[hsl(var(--h),var(--s),var(--l))] flex-shrink-0" />}
                
                {editingId === layer.id ? (
                  <input 
                    autoFocus 
                    value={tempName} 
                    onChange={e => setTempName(e.target.value)} 
                    onBlur={() => saveName(layer.id)} 
                    onKeyDown={e => e.key === 'Enter' && saveName(layer.id)} 
                    className="flex-1 bg-[var(--color-bg-tertiary)] border-none outline-none text-[9px] px-1 rounded font-bold text-[var(--color-text-primary)]" 
                  />
                ) : (
                  <span 
                    onDoubleClick={(e) => startEditing(e as any, layer)} 
                    className={`text-[9px] font-bold truncate flex-1 select-none ${!layer.isVisible ? 'opacity-30 italic' : ''}`}
                  >
                    {layer.name}
                  </span>
                )}
              </div>

              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); onClippingToggle(layer.id); }} 
                  className={`p-1 rounded transition-all ${layer.isClippingMask ? 'text-[hsl(var(--h),var(--s),var(--l))] bg-[hsl(var(--h),var(--s),var(--l),0.1)]' : 'text-[var(--color-text-secondary)] opacity-30'}`} 
                  title="Clipping Mask"
                >
                  <Link size={9} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }} className={`p-1 rounded ${layer.isLocked ? 'text-[hsl(var(--h),var(--s),var(--l))]' : 'text-[var(--color-text-secondary)] opacity-30'}`}>
                  {layer.isLocked ? <Lock size={9} /> : <Unlock size={9} />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAlphaLockToggle(layer.id); }} className={`p-1 rounded text-[7px] font-black ${layer.isAlphaLocked ? 'text-[hsl(var(--h),var(--s),var(--l))] bg-[hsl(var(--h),var(--s),var(--l),0.1)]' : 'text-[var(--color-text-secondary)] opacity-30'}`} title="Alpha Lock">A</button>
              </div>
            </div>

            {activeLayerId === layer.id && (
              <div className="flex flex-col gap-2 mt-1 pt-1 border-t border-[hsl(var(--h),var(--s),var(--l),0.1)] animate-in" onClick={e => e.stopPropagation()}>
                <div className="grid grid-cols-2 gap-1 px-1">
                   <button 
                    onClick={() => onClippingToggle(layer.id)}
                    className={`flex items-center gap-1.5 p-1.5 rounded border text-[7px] font-black uppercase transition-all ${layer.isClippingMask ? 'bg-[hsl(var(--h),var(--s),var(--l))] text-white border-transparent' : 'bg-black/10 border-white/5 opacity-50'}`}
                   >
                     <Link size={10} /> Clipping Mask
                   </button>
                   <button 
                    onClick={() => onAlphaLockToggle(layer.id)}
                    className={`flex items-center gap-1.5 p-1.5 rounded border text-[7px] font-black uppercase transition-all ${layer.isAlphaLocked ? 'bg-[hsl(var(--h),var(--s),var(--l))] text-white border-transparent' : 'bg-black/10 border-white/5 opacity-50'}`}
                   >
                     <ShieldCheck size={10} /> Alpha Lock
                   </button>
                </div>

                <div className="flex flex-col gap-1 px-1 mt-1">
                  <div className="flex items-center justify-between">
                    <select 
                      value={layer.blendMode} 
                      onChange={(e) => onBlendChange(layer.id, e.target.value as BlendMode)} 
                      className="bg-black/20 text-[8px] font-bold outline-none cursor-pointer p-1 rounded border border-white/5 flex-1 mr-2"
                    >
                      {BLEND_MODES.map(m => <option key={m.value} value={m.value} className="bg-[var(--color-bg-secondary)]">{m.label}</option>)}
                    </select>
                    <span className="text-[7px] font-bold opacity-50">{Math.round(layer.opacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={layer.opacity} 
                    onChange={(e) => onOpacityChange(layer.id, parseFloat(e.target.value))} 
                    className="w-full h-1 accent-[hsl(var(--h),var(--s),var(--l))]" 
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Background Setting */}
      <div className="px-3 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/10 flex flex-col gap-2">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
               <Palette size={10} className="opacity-40" />
               <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Background</span>
            </div>
            <div className="flex gap-0.5">
               {['#ffffff', '#000000', '#7f7f7f'].map(color => (
                  <button 
                    key={color} 
                    onClick={() => onBackgroundColorChange(color)}
                    className={`w-2.5 h-2.5 rounded-full border border-white/5 shadow-sm transition-transform hover:scale-125 ${backgroundColor === color ? 'ring-1 ring-[hsl(var(--h),var(--s),var(--l))] ring-offset-1 ring-offset-transparent scale-110' : ''}`}
                    style={{ backgroundColor: color }}
                  />
               ))}
            </div>
         </div>
         <div className="flex items-center gap-2.5 p-1.5 bg-black/20 rounded-lg border border-white/5 hover:border-white/10 transition-colors relative group overflow-hidden">
            <div className="w-6 h-6 rounded-md border border-white/5 shadow-inner flex-shrink-0" style={{ backgroundColor: backgroundColor }} />
            <div className="flex flex-col flex-1">
               <span className="text-[8px] font-mono font-bold uppercase tracking-tight opacity-70 group-hover:text-[hsl(var(--h),var(--s),var(--l))] transition-colors">{backgroundColor}</span>
            </div>
            <input 
              type="color" 
              value={backgroundColor} 
              onChange={(e) => onBackgroundColorChange(e.target.value)} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
         </div>
      </div>

      <div className="p-2 border-t border-[var(--color-border)] flex-shrink-0 bg-[var(--color-bg-secondary)]">
        <button 
          onClick={() => activeLayerId && onDeleteLayer(activeLayerId)} 
          disabled={layers.length <= 1} 
          className="w-full py-1 text-red-400 hover:bg-red-400/10 rounded-md text-[9px] font-bold transition-all disabled:opacity-20 flex items-center justify-center gap-1.5 border border-red-400/10"
        >
          <Trash2 size={10} /> Delete
        </button>
      </div>
    </div>
  );
};

export default LayersPanel;
