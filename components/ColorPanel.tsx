
import React, { useState, useMemo, useRef } from 'react';
import { 
  Hash, Heart, Pipette, Search, Sparkles, Globe, User, Leaf, Cloud, Zap, 
  Layers, Gem, Anchor, History, Cpu, Sun, Snowflake, CheckCircle2, Plus, 
  Save, Trash2, FolderOpen, ChevronDown, ChevronUp
} from 'lucide-react';

type PaletteType = 'spectrum' | 'skin' | 'natural' | 'pastel' | 'earth' | 'neon' | 'greyscale' | 'jewel' | 'deepsea' | 'retro' | 'cyber' | 'autumn' | 'winter';

interface PaletteCollection {
  id: string;
  name: string;
  colors: string[];
}

const hsvToHex = (h: number, s: number, v: number): string => {
  s /= 100; v /= 100;
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let rVal, gVal, bVal;
  switch (i) {
    case 0: rVal = v; gVal = t; bVal = p; break;
    case 1: rVal = q; gVal = v; bVal = p; break;
    case 2: rVal = p; gVal = v; bVal = t; break;
    case 3: rVal = p; gVal = q; bVal = v; break;
    case 4: rVal = t; gVal = p; bVal = v; break;
    case 5: rVal = v; gVal = p; bVal = q; break;
    default: rVal = 0; gVal = 0; bVal = 0;
  }
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(rVal)}${toHex(gVal)}${toHex(bVal)}`.toUpperCase();
};

const generateFullerSpectrum = () => {
  const spectrum = new Set<string>();
  const hues = 240; const cols = 28;  
  for (let r = 0; r < hues; r++) {
    const h = (r / hues) * 360;
    for (let c = 0; c < cols; c++) {
      let s, v;
      if (c < cols / 3) { v = 8 + (c / (cols / 3)) * 92; s = 100; } 
      else if (c < (2 * cols) / 3) { v = 100; s = 100 - ((c - cols / 3) / (cols / 3)) * 65; } 
      else { v = 100; s = 35 - ((c - (2 * cols) / 3) / (cols / 3)) * 35; }
      spectrum.add(hsvToHex(h, s, v));
    }
  }
  return Array.from(spectrum);
};

const generateSkinTones = () => {
  const tones = new Set<string>();
  const hues = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]; 
  hues.forEach(h => {
    for (let r = 0; r < 24; r++) {
      const v = 5 + (r / 24) * 92; 
      for (let c = 0; c < 16; c++) { tones.add(hsvToHex(h, 5 + (c / 16) * 75, v)); }
    }
  });
  return Array.from(tones);
};

const PALETTES: Record<PaletteType, string[]> = {
  spectrum: generateFullerSpectrum(),
  skin: generateSkinTones(),
  natural: [60, 80, 100, 120, 140, 160, 180, 200, 220, 240].flatMap(h => Array.from({length: 18}, (_, r) => Array.from({length: 16}, (_, c) => hsvToHex(h, 5+(c/16)*80, 5+(r/18)*85))).flat()),
  pastel: Array.from({length: 360}, (_, i) => hsvToHex(i, 20, 95)),
  earth: [5, 15, 25, 35, 45, 140, 160].flatMap(h => Array.from({length: 20}, (_, i) => hsvToHex(h, 40, 10 + i * 4))),
  neon: Array.from({length: 360}, (_, i) => hsvToHex(i, 90, 100)),
  greyscale: Array.from({length: 256}, (_, i) => hsvToHex(0, 0, (i / 255) * 100)),
  jewel: [0, 150, 220, 280, 320].flatMap(h => Array.from({length: 15}, (_, i) => hsvToHex(h, 85, 20 + i * 5))),
  deepsea: [180, 200, 220, 240, 260].flatMap(h => Array.from({length: 15}, (_, i) => hsvToHex(h, 65, 5 + i * 5))),
  retro: [20, 45, 160, 210, 340].flatMap(h => Array.from({length: 15}, (_, r) => Array.from({length: 15}, (_, c) => hsvToHex(h, 10+(c/15)*50, 20+(r/15)*60))).flat()),
  cyber: [180, 200, 280, 300, 320].flatMap(h => Array.from({length: 20}, (_, r) => Array.from({length: 15}, (_, c) => hsvToHex(h, 70+(c/15)*30, 30+(r/20)*70))).flat()),
  autumn: [15, 25, 35, 45, 350].flatMap(h => Array.from({length: 20}, (_, r) => Array.from({length: 15}, (_, c) => hsvToHex(h, 40+(c/15)*55, 15+(r/20)*75))).flat()),
  winter: [190, 210, 230, 250, 270].flatMap(h => Array.from({length: 20}, (_, r) => Array.from({length: 15}, (_, c) => hsvToHex(h, 5+(c/15)*45, 40+(r/20)*60))).flat()),
};

interface ColorPanelProps {
  color: string;
  setColor: (color: string) => void;
  swatches: string[];
  setSwatches: React.Dispatch<React.SetStateAction<string[]>>;
  savedPalettes: PaletteCollection[];
  onSavePalette: (name: string) => void;
  onRestorePalette: (palette: PaletteCollection) => void;
  onDeletePalette: (id: string) => void;
}

const ColorPanel: React.FC<ColorPanelProps> = ({ 
  color, setColor, swatches, setSwatches, savedPalettes, onSavePalette, onRestorePalette, onDeletePalette 
}) => {
  const [activeTab, setActiveTab] = useState<PaletteType>('spectrum');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [showSavedList, setShowSavedList] = useState(false);

  const activePalette = useMemo(() => {
    const palette = PALETTES[activeTab];
    if (!searchQuery) return palette;
    const q = searchQuery.toLowerCase().replace('#', '');
    return palette.filter(c => c.toLowerCase().includes(q));
  }, [activeTab, searchQuery]);

  const handlePinColor = () => {
    if (!swatches.includes(color)) {
      setSwatches(prev => [color, ...prev.slice(0, 31)]);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    }
  };

  const handleSaveToCollections = () => {
    const name = prompt("Enter a name for this palette collection (e.g., 'Hero Sketch Colors'):", `Sketch ${savedPalettes.length + 1}`);
    if (name && name.trim()) {
      onSavePalette(name.trim());
    }
  };

  const Tab = ({ type, label, icon: Icon }: { type: PaletteType; label: string; icon: any }) => (
    <button onClick={() => setActiveTab(type)} title={label} className={`flex flex-col items-center justify-center gap-1 py-1.5 transition-all border rounded-md ${activeTab === type ? 'bg-[hsl(var(--h),var(--s),var(--l),0.1)] border-[hsl(var(--h),var(--s),var(--l))] text-[hsl(var(--h),var(--s),var(--l))]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
      <Icon size={12} />
      <span className="text-[6px] font-bold uppercase tracking-tighter leading-none">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-secondary)] overflow-hidden">
      <div className="grid grid-cols-4 gap-1 p-2 bg-black/20 border-b border-white/5 flex-shrink-0">
        <Tab type="spectrum" label="Color" icon={Sparkles} />
        <Tab type="skin" label="Skin" icon={User} />
        <Tab type="natural" label="Nature" icon={Leaf} />
        <Tab type="greyscale" label="Value" icon={Layers} />
        <Tab type="pastel" label="Pastel" icon={Cloud} />
        <Tab type="earth" label="Earth" icon={Globe} />
        <Tab type="jewel" label="Jewel" icon={Gem} />
        <Tab type="neon" label="Neon" icon={Zap} />
        <Tab type="deepsea" label="Sea" icon={Anchor} />
        <Tab type="retro" label="Retro" icon={History} />
        <Tab type="cyber" label="Cyber" icon={Cpu} />
        <Tab type="autumn" label="Autumn" icon={Sun} />
        <Tab type="winter" label="Winter" icon={Snowflake} />
      </div>

      <div className="p-2 border-b border-white/5 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 opacity-20" size={10} />
          <input type="text" placeholder={`Filter colors...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-black/40 text-[9px] py-1 pl-6 pr-2 rounded-md border border-white/5 outline-none font-bold" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1 bg-black/5 select-none">
        <div className="grid gap-[1px]" style={{ gridTemplateColumns: activeTab === 'greyscale' ? 'repeat(16, 1fr)' : activeTab === 'spectrum' ? 'repeat(28, 1fr)' : 'repeat(15, 1fr)' }}>
          {activePalette.map((c, i) => (
            <button key={`${c}-${i}`} onClick={() => setColor(c)} className={`aspect-square transition-transform hover:scale-150 hover:z-20 ${color === c ? 'ring-1 ring-white z-10 scale-125' : ''}`} style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      {/* Palette Collections Section */}
      <div className="flex-shrink-0 flex flex-col max-h-[40%] bg-[var(--color-bg-tertiary)]/30 border-t border-white/10">
         <button 
           onClick={() => setShowSavedList(!showSavedList)}
           className="w-full p-2 flex items-center justify-between hover:bg-white/5 transition-colors"
         >
            <div className="flex items-center gap-2">
               <FolderOpen size={10} className="text-[hsl(var(--h),var(--s),var(--l))]" />
               <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Project Collections</span>
               <span className="bg-black/40 px-1 rounded text-[7px] font-mono opacity-40">{savedPalettes.length}</span>
            </div>
            {showSavedList ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
         </button>
         
         {showSavedList && (
           <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1 min-h-[100px] animate-in">
              {savedPalettes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-20 py-4 gap-1">
                   <Save size={16} />
                   <span className="text-[8px] font-bold uppercase tracking-tight">No Saved Palettes</span>
                </div>
              ) : (
                savedPalettes.map(palette => (
                  <div key={palette.id} className="flex flex-col gap-1.5 p-2 rounded-lg bg-black/30 border border-white/5 group relative hover:border-[hsl(var(--h),var(--s),var(--l),0.3)] transition-all">
                     <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-tight truncate flex-1">{palette.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => onRestorePalette(palette)} className="p-1 hover:bg-white/10 rounded text-green-400" title="Load Palette"><CheckCircle2 size={10} /></button>
                           <button onClick={() => onDeletePalette(palette.id)} className="p-1 hover:bg-red-500/10 rounded text-red-500" title="Delete"><Trash2 size={10} /></button>
                        </div>
                     </div>
                     <div className="flex flex-wrap gap-0.5">
                        {palette.colors.slice(0, 16).map((c, idx) => (
                           <div key={idx} className="w-2.5 h-2.5 rounded-sm shadow-inner" style={{ backgroundColor: c }} />
                        ))}
                        {palette.colors.length > 16 && <div className="text-[6px] font-bold opacity-30 flex items-center ml-1">+{palette.colors.length - 16}</div>}
                     </div>
                  </div>
                ))
              )}
           </div>
         )}
      </div>

      <div className="p-2 bg-[var(--color-bg-tertiary)]/20 border-t border-white/5 flex-shrink-0">
         <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[7px] font-black uppercase tracking-widest opacity-30">Active Palette</span>
            <button onClick={handleSaveToCollections} className="text-[7px] font-black uppercase tracking-widest text-[hsl(var(--h),var(--s),var(--l))] hover:brightness-125 transition-all flex items-center gap-1">
               <Save size={8} /> Save As Set
            </button>
         </div>
         <div className="flex flex-wrap gap-1 px-1 max-h-[60px] overflow-y-auto custom-scrollbar no-scrollbar">
            {swatches.map((c, i) => (
              <button key={`${c}-${i}`} onClick={() => setColor(c)} className={`w-4 h-4 rounded-sm border border-white/5 transition-all hover:scale-125 ${color === c ? 'ring-1 ring-white scale-110 z-10' : ''}`} style={{ backgroundColor: c }} />
            ))}
         </div>
      </div>

      <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.3)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-white/10 shadow-lg relative" style={{ backgroundColor: color }}>
             <input 
               type="color" 
               value={color} 
               onChange={(e) => setColor(e.target.value)} 
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
             />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black font-mono uppercase tracking-tight">{color}</span>
            <span className="text-[6px] font-bold opacity-30 uppercase tracking-[0.2em]">Current Ink</span>
          </div>
        </div>
        
        <button 
          onClick={handlePinColor}
          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${swatches.includes(color) ? 'bg-white/5 border-white/5 text-gray-500 cursor-default' : 'bg-[hsl(var(--h),var(--s),var(--l))] text-white border-transparent hover:brightness-110 active:scale-95'}`}
        >
          {savedFeedback ? <CheckCircle2 size={12} /> : (swatches.includes(color) ? <Heart size={12} fill="currentColor" /> : <Plus size={12} />)}
          {savedFeedback ? 'Pinned!' : 'Pin Color'}
        </button>
      </div>
    </div>
  );
};

export default ColorPanel;
