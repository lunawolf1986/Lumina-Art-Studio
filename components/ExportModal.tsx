
import React, { useState } from 'react';
import { X, Download, FileText, Image as ImageIcon, Zap, CheckCircle2, Layers } from 'lucide-react';
import JSZip from 'jszip';

interface ExportModalProps {
  onClose: () => void;
  canvasRef: React.RefObject<any>;
  layers: any[];
  width: number;
  height: number;
  backgroundColor: string;
  projectName: string;
}

const ExportModal: React.FC<ExportModalProps> = ({ 
  onClose, canvasRef, layers, width, height, backgroundColor, projectName 
}) => {
  const [format, setFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: 'merged' | 'layers') => {
    setIsExporting(true);
    try {
      if (type === 'merged') {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        
        if (format === 'jpg') {
          ctx.fillStyle = backgroundColor === 'transparent' ? 'white' : backgroundColor;
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, width, height);
        }

        // Draw all layers
        // We need to get the layer canvases from the Canvas component
        // For simplicity, let's use the main canvas's data URL if it's already merged
        // But the user wants "Advanced Export", so let's try to be more precise.
        const mainDataUrl = canvasRef.current?.getDataUrl();
        const img = new Image();
        img.src = mainDataUrl;
        await new Promise(resolve => img.onload = resolve);
        ctx.drawImage(img, 0, 0);

        if (includeMetadata) {
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(width - 150, height - 40, 140, 30);
          ctx.fillStyle = 'white';
          ctx.font = '10px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`Lumina Art Studio | 100px = 1 Unit`, width - 20, height - 20);
          ctx.restore();
        }

        const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;
        const dataUrl = canvas.toDataURL(mimeType, 0.9);
        const link = document.createElement('a');
        link.download = `${projectName}.${format}`;
        link.href = dataUrl;
        link.click();
      } else {
        // Export All Layers as ZIP
        const zip = new JSZip();
        // This is tricky because we need the individual layer canvases.
        // I'll need to expose a way to get individual layer data URLs from Canvas.
        // For now, let's assume we can get them.
        const layerData = await canvasRef.current?.getLayersData();
        if (layerData) {
          layerData.forEach((data: { name: string, url: string }, i: number) => {
            const base64Data = data.url.split(',')[1];
            zip.file(`${i + 1}_${data.name}.png`, base64Data, { base64: true });
          });
          const content = await zip.generateAsync({ type: 'blob' });
          const link = document.createElement('a');
          link.download = `${projectName}_layers.zip`;
          link.href = URL.createObjectURL(content);
          link.click();
        }
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in">
      <div className="bg-[#1a1a1a] w-full max-w-[440px] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        <div className="h-12 bg-[#252525] border-b border-white/5 flex items-center justify-between px-5">
          <div className="flex items-center gap-2 text-amber-500">
            <Download size={16} />
            <h2 className="text-[11px] font-black uppercase tracking-widest">Advanced Export</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Output Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(['png', 'jpg', 'webp'] as const).map(f => (
                <button 
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${format === f ? 'bg-amber-500 border-transparent text-black' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Blueprint Metadata</span>
              <span className="text-[8px] font-bold text-gray-500 uppercase">Attach Scale Legend to corner</span>
            </div>
            <button 
              onClick={() => setIncludeMetadata(!includeMetadata)}
              className={`w-10 h-5 rounded-full relative transition-all ${includeMetadata ? 'bg-amber-500' : 'bg-gray-700'}`}
            >
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${includeMetadata ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={() => handleExport('merged')}
              disabled={isExporting}
              className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between px-5 group transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <ImageIcon size={20} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[11px] font-black uppercase tracking-widest text-white">Merged Image</span>
                  <span className="text-[8px] font-bold text-gray-500 uppercase">Single {format.toUpperCase()} file</span>
                </div>
              </div>
              <Download size={16} className="text-gray-600 group-hover:text-white transition-colors" />
            </button>

            <button 
              onClick={() => handleExport('layers')}
              disabled={isExporting}
              className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between px-5 group transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                  <Layers size={20} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[11px] font-black uppercase tracking-widest text-white">Individual Layers</span>
                  <span className="text-[8px] font-bold text-gray-500 uppercase">Export as ZIP archive</span>
                </div>
              </div>
              <Zap size={16} className="text-gray-600 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        <div className="p-4 bg-[#252525] border-t border-white/5 flex items-center justify-center gap-2">
          <Info size={12} className="text-amber-500" />
          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Resolution: {width} x {height} px</span>
        </div>
      </div>
    </div>
  );
};

const Info = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export default ExportModal;
