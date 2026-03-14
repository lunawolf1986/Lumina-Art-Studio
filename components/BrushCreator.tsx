
import React, { useState, useRef, useEffect } from 'react';
import { X, Save, Circle, Upload, Wand2, Info, ChevronDown, RotateCw, Sparkles, Wind, MousePointer2, Timer, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BrushSettings, BrushPreset, Tool } from '../types';

interface BrushCreatorProps {
  onClose: () => void;
  onSave: (brush: BrushPreset) => void;
  initialSettings: BrushSettings;
  accentColor: string;
}

const CATEGORIES = [
  'Anime', 'Pencils', 'Pens', 'Sargent', 'Watercolor', 
  'Sumi-e', 'Thick Paint', 'Pattern Pens', 'Pastels', 'Custom'
];

const easeProgress = (t: number, shape: number) => {
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

const WavyArchitectPreview: React.FC<{ settings: BrushSettings; name: string }> = ({ settings, name }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const { 
      size, hardness, flow, opacity = 1, shape, brushTipData, spacing: spacingMult, rotation, jitter, angleFollow, 
      thicknessStart = 1, thicknessEnd = 1, opacityStart = 1, opacityEnd = 1,
      fadeLengthStart = 0.2, fadeLengthEnd = 0.2, fadeShape = 0.5,
      pressureSize, pressureOpacity, pressureCurve = 1.0
    } = settings;
    
    const previewSize = Math.max(3, Math.min(18, size / 5));
    const spacing = Math.max(1, previewSize * spacingMult);
    
    ctx.save();
    const width = canvas.width;
    const height = canvas.height;
    
    const renderStep = (x: number, y: number, currentFlow: number, currentSize: number, angle: number) => {
      ctx.save();
      ctx.translate(x, y);
      
      let finalRotation = (rotation * Math.PI) / 180;
      if (angleFollow) finalRotation += angle;
      ctx.rotate(finalRotation);

      if (jitter > 0) {
        const offset = (jitter * previewSize) * (Math.random() - 0.5);
        ctx.translate(offset, offset);
      }

      ctx.globalAlpha = Math.max(0, currentFlow * opacity);
      const fill = '#ff9d00';
      
      if (shape === 'custom' && brushTipData) {
        const img = new Image();
        img.src = brushTipData;
        if (img.complete) {
          const scale = Math.min(currentSize / img.width, currentSize / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.globalCompositeOperation = 'source-in';
          ctx.fillStyle = fill;
          ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
        }
      } else {
        if (hardness >= 0.9) {
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0.1, currentSize / 2), 0, Math.PI * 2);
          ctx.fill();
        } else {
          const grad = ctx.createRadialGradient(0, 0, (currentSize / 2) * hardness, 0, 0, currentSize / 2);
          grad.addColorStop(0, fill);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0.1, currentSize / 2), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };

    let lastX = 15;
    let lastY = height / 2;

    for (let x = 15; x < width - 15; x += spacing) {
      const t = (x - 15) / (width - 30);
      const waveY = height / 2 + Math.sin(t * Math.PI * 3) * (height / 8);
      const angle = Math.atan2(waveY - lastY, x - lastX);
      
      let taperSizeMult = 1.0;
      let taperAlphaMult = 1.0;

      if (t < fadeLengthStart && fadeLengthStart > 0) {
        const e = easeProgress(t / fadeLengthStart, fadeShape);
        taperSizeMult = thicknessStart + (1.0 - thicknessStart) * e;
        taperAlphaMult = opacityStart + (1.0 - opacityStart) * e;
      } else if (t > (1.0 - fadeLengthEnd) && fadeLengthEnd > 0) {
        const normalizedEndProgress = (t - (1.0 - fadeLengthEnd)) / fadeLengthEnd;
        const e = easeProgress(1.0 - normalizedEndProgress, fadeShape);
        taperSizeMult = thicknessEnd + (1.0 - thicknessEnd) * e;
        taperAlphaMult = opacityEnd + (1.0 - opacityEnd) * e;
      } else {
        if (fadeLengthStart === 0 && fadeLengthEnd === 0) {
           taperSizeMult = thicknessStart + (thicknessEnd - thicknessStart) * t;
           taperAlphaMult = opacityStart + (opacityEnd - opacityStart) * t;
        }
      }

      // Simulate pressure for preview (vibrant in the middle, light at ends)
      let pressure = 0.3 + 0.7 * Math.sin(t * Math.PI);
      pressure = Math.pow(pressure, 1 / pressureCurve);

      const currentFlow = flow * taperAlphaMult * (pressureOpacity ? pressure : 1.0);
      const currentSize = previewSize * taperSizeMult * (pressureSize ? pressure : 1.0);
      
      renderStep(x, waveY, currentFlow, currentSize, angle);
      lastX = x;
      lastY = waveY;
    }
    ctx.restore();
  }, [settings]);

  return (
    <div className="flex flex-col gap-1">
       <div className="h-16 bg-black/40 rounded-lg border border-white/10 relative overflow-hidden flex items-center justify-center p-1.5">
          <canvas ref={canvasRef} width={300} height={64} className="w-full h-full" />
       </div>
       <div className="flex justify-between items-center px-1">
          <span className="text-[7px] font-black uppercase tracking-widest text-gray-500 truncate max-w-[80px]">{name || 'Unnamed'}</span>
          <span className="text-[6px] font-bold text-gray-600 uppercase">Preview</span>
       </div>
    </div>
  );
};

const Slider = ({ label, value, unit, min, max, onChange, step = 1, icon: Icon }: any) => (
  <div className="flex flex-col gap-1 group p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={9} className="text-gray-500 opacity-50" />}
        <span className="text-[7px] font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-300 transition-colors">{label}</span>
      </div>
      <span className="text-[8px] font-mono font-bold text-amber-500">{value}{unit}</span>
    </div>
    <input 
      type="range" min={min} max={max} step={step} value={value} 
      onChange={e => onChange(parseFloat(e.target.value))} 
      className="w-full h-1 bg-black/40 rounded-full appearance-none accent-amber-500 cursor-pointer" 
    />
  </div>
);

const Toggle = ({ label, active, onToggle, icon: Icon }: any) => (
  <button 
    onClick={onToggle}
    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${active ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10 opacity-50 hover:opacity-100'}`}
  >
    <div className="flex items-center gap-2">
      {Icon && <Icon size={11} className={active ? 'text-amber-500' : 'text-gray-500'} />}
      <span className={`text-[7px] font-black uppercase tracking-widest ${active ? 'text-amber-500' : 'text-gray-400'}`}>{label}</span>
    </div>
    <div className={`w-5 h-2.5 rounded-full relative transition-colors ${active ? 'bg-amber-500' : 'bg-gray-700'}`}>
      <div className={`absolute top-0.5 w-1.5 h-1.5 rounded-full bg-white transition-all ${active ? 'right-0.5' : 'left-0.5'}`} />
    </div>
  </button>
);

const BrushCreator: React.FC<BrushCreatorProps> = ({ onClose, onSave, initialSettings }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Anime');
  const [isConfirming, setIsConfirming] = useState(false);
  const [settings, setSettings] = useState<BrushSettings>({ 
    ...initialSettings,
    rotation: initialSettings.rotation || 0,
    jitter: initialSettings.jitter || 0,
    angleFollow: initialSettings.angleFollow || false,
    smoothingAggression: initialSettings.smoothingAggression || 0,
    smoothingDelay: initialSettings.smoothingDelay || 0,
    thicknessStart: initialSettings.thicknessStart ?? 1.0,
    thicknessEnd: initialSettings.thicknessEnd ?? 1.0,
    opacityStart: initialSettings.opacityStart ?? 1.0,
    opacityEnd: initialSettings.opacityEnd ?? 1.0,
    fadeLengthStart: initialSettings.fadeLengthStart ?? 0.3,
    fadeLengthEnd: initialSettings.fadeLengthEnd ?? 0.3,
    fadeShape: initialSettings.fadeShape ?? 0.5,
    pressureSize: initialSettings.pressureSize ?? true,
    pressureOpacity: initialSettings.pressureOpacity ?? true,
    pressureCurve: initialSettings.pressureCurve ?? 1.6,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveAttempt = () => {
    if (!name.trim()) { alert('Please enter a brush name.'); return; }
    setIsConfirming(true);
  };

  const executeSave = () => {
    const newBrush: BrushPreset = {
      id: `brush_${Date.now()}`,
      name: name.trim(),
      category,
      tool: 'brush',
      settings: { ...settings }
    };
    onSave(newBrush);
    setIsConfirming(false);
  };

  const handleTipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSettings(prev => ({ ...prev, shape: 'custom', brushTipData: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in">
      <div className="bg-[#1a1a1a] w-full max-w-[540px] h-full max-h-[640px] rounded-xl border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-gray-100 font-sans mx-2 relative">
        
        {/* Confirmation Overlay */}
        {isConfirming && (
          <div className="absolute inset-0 z-[600] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in">
            <div className="bg-[#252525] border border-white/10 rounded-2xl p-8 max-w-[320px] w-full flex flex-col items-center text-center gap-6 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                <AlertCircle size={32} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Register Asset?</h3>
                <p className="text-[10px] font-bold text-gray-400 leading-relaxed uppercase tracking-tight">
                  You are about to save <span className="text-amber-500">"{name}"</span> to your brush library. This action will create a permanent preset.
                </p>
              </div>
              <div className="flex flex-col w-full gap-2">
                <button 
                  onClick={executeSave}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={14} /> Confirm Registration
                </button>
                <button 
                  onClick={() => setIsConfirming(false)}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="h-10 bg-[#252525] border-b border-white/5 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                <Wand2 size={12} />
             </div>
             <div>
                <h2 className="text-[9px] font-black uppercase tracking-widest leading-none">Brush Architect</h2>
             </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"><X size={14} /></button>
        </div>

        <div className="flex-1 flex min-h-0 overflow-hidden flex-col sm:flex-row">
          <div className="w-full sm:w-[190px] border-b sm:border-b-0 sm:border-r border-white/5 p-4 flex flex-col gap-4 bg-[#1e1e1e] overflow-y-auto custom-scrollbar">
             <WavyArchitectPreview settings={settings} name={name} />
             
             <div className="space-y-3">
                <div className="flex flex-col gap-1">
                   <label className="text-[7px] font-black uppercase tracking-widest text-gray-500 pl-1">Identity</label>
                   <input 
                     type="text" placeholder="Brush Name..." value={name} onChange={e => setName(e.target.value)}
                     className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] font-bold outline-none focus:border-amber-500/50 transition-all"
                   />
                </div>

                <div className="flex flex-col gap-1">
                   <label className="text-[7px] font-black uppercase tracking-widest text-gray-500 pl-1">Category</label>
                   <div className="relative">
                      <select 
                        value={category} onChange={e => setCategory(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] font-bold outline-none appearance-none cursor-pointer focus:border-amber-500/50"
                      >
                        {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-[#1e1e1e] text-white">{cat}</option>)}
                      </select>
                      <ChevronDown size={9} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                   </div>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2">
                   <Toggle 
                     label="Angle Follow" 
                     active={settings.angleFollow} 
                     onToggle={() => setSettings({...settings, angleFollow: !settings.angleFollow})} 
                     icon={MousePointer2}
                   />
                </div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[#1a1a1a]">
             <div className="grid grid-cols-1 gap-3">
                
                <div className="space-y-2">
                   <span className="text-[7px] font-black uppercase tracking-widest text-gray-500 pl-1">Shape Engine</span>
                   <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setSettings({...settings, shape: 'round'})}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border transition-all ${settings.shape === 'round' ? 'bg-amber-500 text-black font-black border-transparent' : 'bg-white/5 border-white/10 opacity-40 hover:opacity-100'}`}
                      >
                         <Circle size={10} /> <span className="text-[8px] uppercase tracking-wider">Round</span>
                      </button>
                      <button 
                        onClick={() => { if(!settings.brushTipData) fileInputRef.current?.click(); else setSettings({...settings, shape: 'custom'}); }}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border transition-all ${settings.shape === 'custom' ? 'bg-amber-500 text-black font-black border-transparent' : 'bg-white/5 border-white/10 opacity-40 hover:opacity-100'}`}
                      >
                         <Upload size={10} /> <span className="text-[8px] uppercase tracking-wider">Custom</span>
                      </button>
                   </div>
                   <input ref={fileInputRef} type="file" accept="image/*" onChange={handleTipUpload} className="hidden" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Slider label="Size" value={settings.size} unit="px" min={1} max={500} onChange={(v:any) => setSettings({...settings, size: v})} />
                  <Slider label="Flow" value={Math.round(settings.flow * 100)} unit="%" min={0} max={100} onChange={(v:any) => setSettings({...settings, flow: v/100})} />
                  <Slider label="Opacity" value={Math.round(settings.opacity * 100)} unit="%" min={0} max={100} onChange={(v:any) => setSettings({...settings, opacity: v/100})} />
                  <Slider label="Hard" value={Math.round(settings.hardness * 100)} unit="%" min={0} max={100} onChange={(v:any) => setSettings({...settings, hardness: v/100})} />
                  <Slider label="Gap" value={settings.spacing} unit="" min={0.01} max={1.0} step={0.01} onChange={(v:any) => setSettings({...settings, spacing: v})} />
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                   <span className="text-[7px] font-black uppercase tracking-widest text-gray-500 pl-1 flex items-center gap-1.5"><Zap size={9} /> Pressure Response</span>
                   <div className="grid grid-cols-2 gap-2">
                      <Toggle 
                        label="Size Dynamics" 
                        active={settings.pressureSize} 
                        onToggle={() => setSettings({...settings, pressureSize: !settings.pressureSize})} 
                      />
                      <Toggle 
                        label="Opacity Dynamics" 
                        active={settings.pressureOpacity} 
                        onToggle={() => setSettings({...settings, pressureOpacity: !settings.pressureOpacity})} 
                      />
                      <div className="col-span-2">
                        <Slider label="Pressure Curve" value={settings.pressureCurve.toFixed(1)} unit="" min={0.5} max={2.0} step={0.1} onChange={(v:any) => setSettings({...settings, pressureCurve: v})} icon={Zap} />
                      </div>
                   </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                   <span className="text-[7px] font-black uppercase tracking-widest text-gray-500 pl-1">Smoothing Controls</span>
                   <div className="grid grid-cols-1 gap-2">
                      <Slider label="Stabilization" value={Math.round(settings.stabilization * 100)} unit="%" min={0} max={100} onChange={(v:any) => setSettings({...settings, stabilization: v/100})} icon={Wind} />
                      <Slider label="Smoothing Aggression" value={Math.round(settings.smoothingAggression * 100)} unit="%" min={0} max={100} onChange={(v:any) => setSettings({...settings, smoothingAggression: v/100})} icon={Wind} />
                      <Slider label="Smoothing Delay" value={settings.smoothingDelay} unit="px" min={0} max={500} onChange={(v:any) => setSettings({...settings, smoothingDelay: v})} icon={Timer} />
                   </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                   <span className="text-[7px] font-black uppercase tracking-widest text-gray-500 pl-1">Tapering Dynamics</span>
                   <div className="grid grid-cols-2 gap-2">
                      <Slider label="Start Length" value={Math.round(settings.fadeLengthStart * 100)} unit="%" min={0} max={100} onChange={(v:any) => setSettings({...settings, fadeLengthStart: v/100})} />
                      <Slider label="End Length" value={Math.round(settings.fadeLengthEnd * 100)} unit="%" min={0} max={100} onChange={(v:any) => setSettings({...settings, fadeLengthEnd: v/100})} />
                      <Slider label="Start Thick" value={Math.round(settings.thicknessStart * 100)} unit="%" min={0} max={100} onChange={(v:any) => setSettings({...settings, thicknessStart: v/100})} />
                      <Slider label="End Thick" value={Math.round(settings.thicknessEnd * 100)} unit="%" min={0} max={100} onChange={(v:any) => setSettings({...settings, thicknessEnd: v/100})} />
                      <Slider label="Start Opacity" value={Math.round(settings.opacityStart * 100)} unit="%" min={0} max={100} onChange={(v:any) => setSettings({...settings, opacityStart: v/100})} />
                      <Slider label="End Opacity" value={Math.round(settings.opacityEnd * 100)} unit="%" min={0} max={100} onChange={(v:any) => setSettings({...settings, opacityEnd: v/100})} />
                      <div className="col-span-2">
                        <Slider label="Fade Shape (Round -> Pointed)" value={Math.round(settings.fadeShape * 100)} unit="%" min={0} max={100} onChange={(v:any) => setSettings({...settings, fadeShape: v/100})} />
                      </div>
                   </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                   <span className="text-[7px] font-black uppercase tracking-widest text-gray-500 pl-1">Engine Dynamics</span>
                   <div className="grid grid-cols-2 gap-2">
                      <Slider label="Rotate" value={settings.rotation} unit="°" min={0} max={360} onChange={(v:any) => setSettings({...settings, rotation: v})} icon={RotateCw} />
                      <Slider label="Jitter" value={Math.round(settings.jitter * 100)} unit="%" min={0} max={100} onChange={(v:any) => setSettings({...settings, jitter: v/100})} icon={Sparkles} />
                   </div>
                </div>

             </div>
          </div>
        </div>

        <div className="h-12 bg-[#252525] border-t border-white/5 px-4 flex items-center justify-end gap-2 flex-shrink-0">
           <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">Cancel</button>
           <button 
             onClick={handleSaveAttempt}
             className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 shadow-[0_4px_15px_rgba(245,158,11,0.2)]"
           >
              <Save size={12} /> Register Asset
           </button>
        </div>

      </div>
    </div>
  );
};

export default BrushCreator;
