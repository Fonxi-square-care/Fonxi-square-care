
import React, { useState, useRef, useEffect } from 'react';
import { LoadingOverlay } from './components/LoadingOverlay';
import { generateEcomImage, editImageWithPrompt, StudioPreset, ANGLES } from './services/geminiService';
import { GeneratedImage, AppStatus } from './types';

const PRESETS: { id: StudioPreset; label: string; icon: string }[] = [
  { id: 'editorial', label: 'Editorial', icon: 'fa-camera-retro' },
  { id: 'streetwear', label: 'Street', icon: 'fa-road' },
  { id: 'lifestyle', label: 'Lifestyle', icon: 'fa-house' },
  { id: 'minimalist', label: 'Clean', icon: 'fa-leaf' },
];

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [progress, setProgress] = useState<{ current: number; total: number } | undefined>(undefined);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPreviewId, setCurrentPreviewId] = useState<string | null>(null);
  const [currentPreset, setCurrentPreset] = useState<StudioPreset>('editorial');
  const [editPrompt, setEditPrompt] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSourceImage(event.target?.result as string);
      setResults([]);
      setSelectedIds(new Set());
      setCurrentPreviewId(null);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const toCleanBase64 = (dataUrl: string) => {
    const parts = dataUrl.split(',');
    return parts.length > 1 ? parts[1] : dataUrl;
  };

  const handleGenerateCollection = async () => {
    if (!sourceImage) return;
    
    // Clear previous results and errors
    setResults([]);
    setSelectedIds(new Set());
    setErrorMessage(null);
    setStatus('generating');
    setProgress({ current: 0, total: ANGLES.length });

    const cleanBase = toCleanBase64(sourceImage);
    const generated: GeneratedImage[] = [];

    // Run sequentially to prevent 429 Rate Limit errors
    for (let i = 0; i < ANGLES.length; i++) {
      const angle = ANGLES[i];
      try {
        const url = await generateEcomImage(cleanBase, currentPreset, angle);
        const newItem: GeneratedImage = {
          id: Math.random().toString(36).substr(2, 9),
          url,
          prompt: `${angle} (${currentPreset})`,
          timestamp: Date.now()
        };
        generated.push(newItem);
        setResults([...generated]); // Progressive update
        if (i === 0) setCurrentPreviewId(newItem.id);
        setProgress({ current: i + 1, total: ANGLES.length });
      } catch (err: any) {
        console.error(`Error generating angle ${angle}:`, err);
        // We continue with other angles even if one fails
      }
    }

    setStatus('idle');
    setProgress(undefined);

    if (generated.length === 0) {
      setErrorMessage("No images could be generated. Please check your API key or try a different product shot.");
    } else if (generated.length < ANGLES.length) {
      setErrorMessage(`Successfully generated ${generated.length} of ${ANGLES.length} images. Some angles failed due to studio constraints.`);
    }
  };

  const deleteImage = (id: string) => {
    const updated = results.filter(r => r.id !== id);
    setResults(updated);
    if (currentPreviewId === id) {
      setCurrentPreviewId(updated.length > 0 ? updated[0].id : null);
    }
    const newSelected = new Set(selectedIds);
    newSelected.delete(id);
    setSelectedIds(newSelected);
  };

  const bulkDelete = () => {
    const updated = results.filter(r => !selectedIds.has(r.id));
    setResults(updated);
    if (currentPreviewId && selectedIds.has(currentPreviewId)) {
      setCurrentPreviewId(updated.length > 0 ? updated[0].id : null);
    }
    setSelectedIds(new Set());
  };

  const bulkDownload = () => {
    const toDownload = results.filter(r => selectedIds.has(r.id));
    toDownload.forEach((img, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = img.url;
        link.download = `studio-export-${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 200); // Stagger downloads to avoid browser block
    });
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === results.length && results.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(results.map(r => r.id)));
  };

  const currentPreview = results.find(r => r.id === currentPreviewId);

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] text-slate-900">
      <LoadingOverlay active={status === 'generating' || status === 'editing'} progress={progress} />
      
      <nav className="h-20 px-8 flex items-center justify-between border-b border-slate-200 bg-white/70 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-sm">
            <i className="fa-solid fa-gem text-lg"></i>
          </div>
          <span className="font-serif text-2xl tracking-tight italic">E-Com Studio <span className="text-slate-400 not-italic font-sans text-lg ml-1 uppercase tracking-widest">Premium</span></span>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest"
          >
            New Product
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        </div>
      </nav>

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-8 grid grid-cols-12 gap-10">
        <aside className="col-span-12 lg:col-span-3 space-y-8">
          <div className="glass rounded-3xl p-6 space-y-4 shadow-sm border border-slate-200/50">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Product Reference</h3>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer group hover:border-slate-400 transition-all"
            >
              {sourceImage ? (
                <img src={sourceImage} alt="Reference" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="text-center p-6">
                  <i className="fa-solid fa-plus text-slate-300 text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Select Product</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Studio Vibe</h3>
            <div className="grid grid-cols-2 gap-3">
              {PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setCurrentPreset(preset.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                    currentPreset === preset.id 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400'
                  }`}
                >
                  <i className={`fa-solid ${preset.icon} mb-2 text-lg`}></i>
                  <span className="text-[11px] font-bold uppercase tracking-wider">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!sourceImage || status !== 'idle'}
            onClick={handleGenerateCollection}
            className={`w-full py-5 rounded-3xl font-bold uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 shadow-2xl ${
              sourceImage && status === 'idle'
              ? 'bg-slate-900 text-white hover:bg-black hover:-translate-y-1'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <i className="fa-solid fa-camera-viewfinder"></i>
            Render 10 Angles
          </button>

          {errorMessage && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[11px] font-medium border border-red-100 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
              <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
              <span>{errorMessage}</span>
            </div>
          )}
        </aside>

        <section className="col-span-12 lg:col-span-9 flex flex-col gap-6">
          <div className="flex-1 bg-white rounded-[40px] shadow-2xl border border-slate-200 relative overflow-hidden flex flex-col group/canvas">
            
            {/* Featured Image Canvas */}
            <div className="h-[60%] relative bg-slate-50 flex items-center justify-center p-8 border-b border-slate-100">
               {currentPreview && (
                <div className="absolute top-6 right-6 z-20 flex gap-2">
                  <button 
                    onClick={() => toggleSelect(currentPreview.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${selectedIds.has(currentPreview.id) ? 'bg-indigo-600 text-white' : 'bg-white/80 text-slate-400 hover:text-slate-900'}`}
                  >
                    <i className={`fa-solid ${selectedIds.has(currentPreview.id) ? 'fa-check-circle' : 'fa-circle'}`}></i>
                  </button>
                  <a href={currentPreview.url} download={`${currentPreviewId}.png`} className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm transition-all">
                    <i className="fa-solid fa-download"></i>
                  </a>
                  <button onClick={() => deleteImage(currentPreview.id)} className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 shadow-sm transition-all">
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              )}

              <div className="h-full aspect-square relative flex items-center justify-center">
                {currentPreview && !showOriginal ? (
                  <img src={currentPreview.url} alt="Preview" className="h-full w-full object-contain rounded-2xl shadow-xl animate-in fade-in duration-500" />
                ) : sourceImage ? (
                  <img src={sourceImage} alt="Source" className="h-full w-full object-contain opacity-50" />
                ) : (
                  <div className="text-center">
                    <i className="fa-solid fa-images text-4xl text-slate-200 mb-4"></i>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300">Awaiting Generation</p>
                  </div>
                )}
              </div>
            </div>

            {/* Collection Grid View */}
            <div className="flex-1 p-6 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Studio Collection</h3>
                  {results.length > 0 && (
                    <button onClick={selectAll} className="text-[10px] font-bold text-slate-600 hover:text-slate-900 uppercase tracking-tighter transition-colors">
                      {selectedIds.size === results.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-3 animate-in slide-in-from-right duration-300">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{selectedIds.size} Selected</span>
                    <button onClick={bulkDownload} className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors uppercase tracking-widest">Download All</button>
                    <button onClick={bulkDelete} className="text-[10px] font-bold bg-red-50 text-red-600 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors uppercase tracking-widest">Delete Selected</button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-5 gap-4 overflow-y-auto custom-scrollbar flex-1 pb-4 pr-2">
                {results.map((item) => (
                  <div 
                    key={item.id}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${currentPreviewId === item.id ? 'border-slate-900 shadow-md scale-95' : 'border-transparent hover:border-slate-200'}`}
                  >
                    <img 
                      src={item.url} 
                      onClick={() => setCurrentPreviewId(item.id)} 
                      alt="Thumbnail" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                    
                    {/* Checkbox Overlay */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                      className={`absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${selectedIds.has(item.id) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/90 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600'}`}
                    >
                      <i className={`fa-solid ${selectedIds.has(item.id) ? 'fa-check' : 'fa-circle'} text-[10px]`}></i>
                    </button>

                    {/* Quick Trash */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteImage(item.id); }}
                      className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-all"
                    >
                      <i className="fa-solid fa-trash text-[10px]"></i>
                    </button>

                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-white/90 translate-y-full group-hover:translate-y-0 transition-transform duration-300 backdrop-blur-sm">
                      <p className="text-[8px] font-bold uppercase truncate text-slate-600">{item.prompt}</p>
                    </div>
                  </div>
                ))}
                {results.length === 0 && (
                   <div className="col-span-5 h-full border-2 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center py-10">
                     <i className="fa-solid fa-wand-magic-sparkles text-slate-100 text-4xl mb-3"></i>
                     <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">Collection empty</p>
                   </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
