
import React, { useState, useEffect } from 'react';

const MESSAGES = [
  "Setting up the lighting rig...",
  "Directing the model's pose...",
  "Calibrating lens focus...",
  "Refining fabric textures...",
  "Applying professional color grade...",
  "Polishing studio environment...",
  "Finalizing high-res composition...",
];

interface LoadingOverlayProps {
  active: boolean;
  progress?: { current: number; total: number };
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ active, progress }) => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-xl">
      <div className="text-center p-8 max-w-sm w-full">
        <div className="relative w-32 h-32 mx-auto mb-10">
          <div className="absolute inset-0 rounded-full border-[1px] border-slate-100"></div>
          <div 
            className="absolute inset-0 rounded-full border-t-2 border-slate-900 animate-spin transition-all duration-500" 
            style={{ animationDuration: '1.2s' }}
          ></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <i className="fa-solid fa-gem text-slate-900 text-3xl animate-pulse mb-1"></i>
            {progress && (
              <span className="text-[10px] font-bold text-slate-900 tabular-nums">
                {progress.current}/{progress.total}
              </span>
            )}
          </div>
        </div>
        
        <h3 className="font-serif text-2xl italic text-slate-900 mb-2 tracking-tight">Studio in Progress</h3>
        
        {progress && (
          <div className="w-full bg-slate-100 h-1 rounded-full mb-6 overflow-hidden">
            <div 
              className="bg-slate-900 h-full transition-all duration-700 ease-out" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        )}

        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] h-4 transition-all duration-500">
          {MESSAGES[messageIndex]}
        </p>
      </div>
    </div>
  );
};
