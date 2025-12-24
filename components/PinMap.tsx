
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ParseResult, NailData } from '../types';

interface PinMapProps {
  data: ParseResult;
  activePinId: string | null;
}

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

const PinMap: React.FC<PinMapProps> = ({ data, activePinId }) => {
  const { nails, bounds } = data;
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredNail, setHoveredNail] = useState<NailData | null>(null);

  const padding = 20;
  const width = (bounds.maxX - bounds.minX) + padding * 2;
  const height = (bounds.maxY - bounds.minY) + padding * 2;
  const viewBoxX = bounds.minX - padding;
  const viewBoxY = bounds.minY - padding;

  // Center on active pin when it changes
  useEffect(() => {
    if (activePinId) {
      const pin = nails.find(n => n.id === activePinId);
      if (pin) {
        // Target center of viewport
        const centerX = viewBoxX + width / 2;
        const centerY = viewBoxY + height / 2;
        
        // Target zoom for finding pins
        const targetZoom = Math.max(zoom, 10);
        setZoom(targetZoom);

        setOffset({
          x: centerX / targetZoom - pin.x,
          y: centerY / targetZoom - pin.y
        });
      }
    }
  }, [activePinId, nails, viewBoxX, width, viewBoxY, height]);

  const renderedNails = useMemo(() => {
    return nails.map((nail) => {
      const color = getPinColor(nail.type);
      const isHovered = hoveredNail?.id === nail.id;
      const isActive = activePinId === nail.id;
      
      const baseRadius = 0.4; 
      const radius = baseRadius / Math.pow(zoom, 0.3);

      return (
        <g 
          key={nail.id} 
          onMouseEnter={() => setHoveredNail(nail)}
          onMouseLeave={() => setHoveredNail(null)}
          className="cursor-pointer"
        >
          <circle cx={nail.x} cy={nail.y} r={2 / zoom} fill="transparent" />
          
          <circle
            cx={nail.x}
            cy={nail.y}
            r={isActive ? radius * 2.5 : radius}
            fill={isActive ? "#ef4444" : color} // Red color for search highlight
            stroke={isActive ? "white" : (isHovered ? "white" : "none")}
            strokeWidth={isActive ? 0.8 / zoom : (0.2 / zoom)}
            className="transition-all duration-300"
          />
          
          {(isHovered || isActive) && (
            <circle
              cx={nail.x}
              cy={nail.y}
              r={radius * (isActive ? 4 : 1.8)}
              fill="none"
              stroke={isActive ? "#ef4444" : color}
              strokeWidth={0.15 / zoom}
              className="animate-pulse"
            />
          )}
          
          {showLabels && (
            <text
              x={nail.x + radius * 1.5}
              y={nail.y + radius * 0.5}
              fill={isActive ? "#ef4444" : "white"}
              className={`pointer-events-none font-mono select-none transition-all ${isActive ? 'font-black' : 'font-bold opacity-80'}`}
              style={{ fontSize: `${Math.max(0.4, (isActive ? 2.5 : 1.2) / Math.sqrt(zoom))}px` }}
            >
              {nail.id}
            </text>
          )}
        </g>
      );
    });
  }, [nails, zoom, showLabels, hoveredNail, activePinId]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.05), 100));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 select-none">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-slate-800/90 backdrop-blur-md p-2 rounded-lg border border-slate-600 shadow-xl flex flex-col gap-2">
          <button onClick={() => setZoom(z => z * 1.5)} className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-blue-600 text-white rounded transition-all active:scale-90"><i className="fas fa-plus"></i></button>
          <button onClick={() => setZoom(z => z * 0.7)} className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-blue-600 text-white rounded transition-all active:scale-90"><i className="fas fa-minus"></i></button>
          <button onClick={resetView} className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-blue-600 text-white rounded transition-all active:scale-90"><i className="fas fa-expand"></i></button>
        </div>
        <div className="bg-slate-800/90 backdrop-blur-md p-3 rounded-lg border border-slate-600 shadow-xl">
          <label className="flex items-center gap-2 text-white text-xs font-bold cursor-pointer group">
            <input type="checkbox" checked={showLabels} onChange={() => setShowLabels(!showLabels)} className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 accent-blue-500" />
            Show IDs
          </label>
        </div>
      </div>

      {hoveredNail && (
        <div className="absolute bottom-4 right-4 z-10 bg-slate-800/95 border-l-4 p-4 rounded-lg shadow-2xl text-white max-w-xs backdrop-blur-sm animate-in fade-in slide-in-from-right-2" style={{ borderLeftColor: getPinColor(hoveredNail.type) }}>
          <div className="flex justify-between items-start mb-2">
            <div className="text-blue-400 font-bold text-lg">{hoveredNail.id}</div>
            <span className="px-2 py-0.5 rounded bg-slate-700 text-[10px] font-bold uppercase tracking-wider">Type: {hoveredNail.type}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-slate-400">Net Name:</span> <span className="text-right truncate">{hoveredNail.netName}</span>
            <span className="text-slate-400">Coords:</span> <span className="text-right font-mono">{hoveredNail.x.toFixed(3)}, {hoveredNail.y.toFixed(3)}</span>
          </div>
        </div>
      )}

      <svg ref={svgRef} className="w-full h-full cursor-move" viewBox={`${viewBoxX} ${viewBoxY} ${width} ${height}`} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <g transform={`scale(${zoom}) translate(${offset.x}, ${offset.y})`}>
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/></pattern>
            <pattern id="grid-bold" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/></pattern>
          </defs>
          <rect x={viewBoxX - 5000} y={viewBoxY - 5000} width={width + 10000} height={height + 10000} fill="url(#grid)" />
          <rect x={viewBoxX - 5000} y={viewBoxY - 5000} width={width + 10000} height={height + 10000} fill="url(#grid-bold)" />
          {renderedNails}
        </g>
      </svg>
      <div className="absolute bottom-4 left-4 flex gap-4 bg-slate-800/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-700/50 text-[10px] text-slate-400 font-mono">
        <span><i className="fas fa-search-plus mr-1"></i>{(zoom * 100).toFixed(0)}%</span>
        <span><i className="fas fa-map-pin mr-1"></i>{nails.length} pins</span>
      </div>
    </div>
  );
};

export default PinMap;
