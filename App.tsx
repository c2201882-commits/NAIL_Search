
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { parseNailFile } from './services/parser';
import { ParseResult, NailData } from './types';
import PinMap from './components/PinMap';

const TYPE_COLORS: Record<string, string> = {
  '7': '#3b82f6',
  'AA': '#10b981',
  'BB': '#f59e0b',
  'CC': '#ef4444',
  'TP': '#8b5cf6',
  'FIX': '#64748b',
};

const getPinColor = (type: string) => {
  if (TYPE_COLORS[type]) return TYPE_COLORS[type];
  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = type.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
};

type SearchMode = 'nail' | 'net';

const App: React.FC = () => {
  const [data, setData] = useState<ParseResult | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('nail');
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);

  // Pin Display Settings
  const [pinScale, setPinScale] = useState(0.4);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const result = parseNailFile(text, file.name);
      setData(result);
      setError(null);
      setSearchQuery('');
      setActivePinId(null);
      setActiveResultIndex(-1);

      // Auto-calculate initial pin scale based on board dimensions
      // A reasonable size is roughly 0.5% of the average dimension
      const width = result.bounds.maxX - result.bounds.minX;
      const height = result.bounds.maxY - result.bounds.minY;
      const avgDim = (width + height) / 2;
      const calculatedScale = Math.max(0.1, avgDim / 150); // Heuristic for visibility
      setPinScale(calculatedScale);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to parse file.');
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const uniqueTypes = useMemo(() => {
    if (!data) return [];
    const types = new Set<string>();
    data.nails.forEach(n => types.add(n.type));
    return Array.from(types).sort();
  }, [data]);

  const filteredResults = useMemo(() => {
    if (!data || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return data.nails.filter(n => {
      if (searchMode === 'nail') {
        return n.id.toLowerCase().includes(q);
      } else {
        return n.netName.toLowerCase().includes(q);
      }
    });
  }, [data, searchQuery, searchMode]);

  // Handle Search Navigation
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (filteredResults.length > 0) {
        const nextIndex = (activeResultIndex + 1) % filteredResults.length;
        setActiveResultIndex(nextIndex);
        setActivePinId(filteredResults[nextIndex].id);
      }
    }
  };

  // Reset index when query or mode changes
  useEffect(() => {
    setActiveResultIndex(-1);
  }, [searchQuery, searchMode]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* Top Header & Search Bar Area */}
      <header className="bg-white border-b border-slate-200 shadow-sm z-30 shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white w-9 h-9 rounded-lg flex items-center justify-center shadow-lg shadow-blue-100">
              <i className="fas fa-bullseye text-lg"></i>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800">PinLocator</h1>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none">ICT Suite 2.4</p>
            </div>
          </div>

          {data && (
            <div className="flex-1 max-w-2xl mx-12">
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                {/* Mode Selector */}
                <div className="flex gap-1 bg-white p-0.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
                  <button 
                    onClick={() => setSearchMode('nail')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all ${searchMode === 'nail' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Nail ID
                  </button>
                  <button 
                    onClick={() => setSearchMode('net')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all ${searchMode === 'net' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Net Name
                  </button>
                </div>
                
                {/* Search Input */}
                <div className="relative flex-1">
                  <i className="fas fa-search absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                  <input 
                    type="text" 
                    placeholder={searchMode === 'nail' ? "Search Nail ID (Enter to cycle results)..." : "Search Net Name (Enter to cycle results)..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full pl-9 pr-24 py-2 bg-transparent rounded-xl text-sm font-bold focus:outline-none placeholder:text-slate-400"
                  />
                  {filteredResults.length > 0 && (
                    <div className="absolute right-3 top-2 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                      {activeResultIndex + 1} / {filteredResults.length}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {data && (
            <div className="flex items-center gap-4">
              <div className="text-right hidden xl:block">
                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Active PCB</div>
                <div className="text-xs font-bold text-slate-600 max-w-[150px] truncate">{data.metadata.fileName}</div>
              </div>
              <button onClick={() => setData(null)} className="bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm">
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col">
        {!data ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div 
              className={`max-w-xl w-full p-16 border-4 border-dashed rounded-3xl transition-all duration-300 flex flex-col items-center text-center ${
                isDraggingFile ? 'border-blue-500 bg-blue-50 scale-105 shadow-2xl shadow-blue-100' : 'border-slate-200 bg-white shadow-sm'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={onDrop}
            >
              <div className="w-24 h-24 bg-blue-600 text-white rounded-3xl flex items-center justify-center mb-8 shadow-xl rotate-3 shadow-blue-200"><i className="fas fa-search-location text-4xl"></i></div>
              <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Pin Map Locator</h2>
              <p className="text-slate-500 mb-10 max-w-sm text-lg font-medium leading-relaxed">Drop your <span className="text-blue-600">.asc</span>, <span className="text-blue-600">.fab</span>, or <span className="text-blue-600">.txt</span> file to find any test point instantly.</p>
              <label className="bg-slate-900 hover:bg-slate-800 text-white px-10 py-4 rounded-2xl font-black text-lg cursor-pointer transition-all shadow-xl active:scale-95 flex items-center gap-3">
                <i className="fas fa-plus"></i>Select File<input type="file" className="hidden" onChange={onFileChange} accept=".txt,.fab,.csv,.asc" />
              </label>
              {error && <div className="mt-8 p-5 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-4 text-sm font-bold animate-pulse"><i className="fas fa-exclamation-triangle"></i>{error}</div>}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Map Area */}
            <div className="flex-1 p-4 relative">
              <PinMap data={data} activePinId={activePinId} pinScale={pinScale} />
              
              {/* Type Legend Floating */}
              <div className="absolute top-8 right-8 pointer-events-none">
                <div className="bg-white/90 backdrop-blur shadow-xl border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 pointer-events-auto w-40">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Legend</h4>
                  <div className="flex flex-col gap-2">
                    {uniqueTypes.map(type => (
                      <div key={type} className="flex items-center gap-2 group cursor-default">
                        <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: getPinColor(type) }}></span>
                        <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{type}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1 mt-1 border-t border-slate-100">
                      <span className="w-2.5 h-2.5 rounded-full shadow-sm bg-red-500 animate-pulse"></span>
                      <span className="text-[11px] font-black text-red-600 uppercase">Searching</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar with Stats & Controls */}
            <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto p-6 hidden lg:flex flex-col gap-6">
              {/* Pin Size Control */}
              <section className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Pin Display</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase">
                    <span>Pin Size</span>
                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{pinScale.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.05" 
                    max="5" 
                    step="0.05"
                    value={pinScale}
                    onChange={(e) => setPinScale(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[9px] font-bold text-slate-300">
                    <span>Small</span>
                    <span>Large</span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-black text-slate-400 uppercase mb-5 tracking-widest">Layout Summary</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
                    <div className="text-4xl font-black text-blue-700 tracking-tighter">{data.metadata.totalNails}</div>
                    <div className="text-[10px] font-black text-blue-500 uppercase mt-1 tracking-widest">Total Pins Detected</div>
                  </div>
                  <div className="bg-slate-900 p-5 rounded-2xl shadow-xl text-white">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest">Board Dimensions</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Width</span>
                        <span className="font-mono font-bold bg-slate-800 px-3 py-1 rounded text-sm tracking-tight">
                          {(data.bounds.maxX - data.bounds.minX).toFixed(2)} {data.metadata.units}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Height</span>
                        <span className="font-mono font-bold bg-slate-800 px-3 py-1 rounded text-sm tracking-tight">
                          {(data.bounds.maxY - data.bounds.minY).toFixed(2)} {data.metadata.units}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Mini List of Highlights */}
              {searchQuery && filteredResults.length > 0 && (
                <section className="flex-1 flex flex-col min-h-0">
                  <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Match Results</h3>
                  <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-100 divide-y divide-slate-50 bg-slate-50/50">
                    {filteredResults.slice(0, 50).map((nail, idx) => (
                      <button 
                        key={`${nail.id}-${idx}`} 
                        onClick={() => {
                          setActivePinId(nail.id);
                          setActiveResultIndex(idx);
                        }}
                        className={`w-full text-left p-4 flex flex-col gap-0.5 transition-all ${activePinId === nail.id && activeResultIndex === idx ? 'bg-white shadow-md border-l-4 border-red-500 translate-x-1' : 'hover:bg-white'}`}
                      >
                        <div className="flex justify-between">
                          <span className={`text-sm font-black ${activePinId === nail.id && activeResultIndex === idx ? 'text-red-600' : 'text-slate-800'}`}>{nail.id}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded leading-none">{nail.type}</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 truncate mt-1">Net: {nail.netName}</div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-3 text-[10px] text-slate-400 shrink-0 flex justify-between items-center font-bold uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <span className="text-blue-600">Precision Mapping Engine</span>
          <span className="text-slate-200">|</span>
          <span>© 2025 Engineering Labs</span>
        </div>
        <div className="flex gap-6 items-center">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
            System Ready
          </span>
          <span className="bg-slate-100 px-2 py-1 rounded">V2.4 STABLE</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
