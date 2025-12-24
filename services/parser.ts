
import { NailData, ParseResult } from '../types';

export const parseNailFile = (content: string, fileName: string): ParseResult => {
  const lines = content.split('\n');
  const nails: NailData[] = [];
  
  let units = 'Unknown';
  let date = '';
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Extract metadata from headers
    if (trimmed.includes('Metric units')) units = 'Metric';
    if (trimmed.includes('Imperial units')) units = 'Imperial';
    if (/\d{1,2}-\w+-\d{4}/.test(trimmed)) {
      const dateMatch = trimmed.match(/\d{1,2}-\w+-\d{4}\s+\d{2}:\d{2}/);
      if (dateMatch) date = dateMatch[0];
    }

    // Parse data rows
    // Standard Tebo-ICT format starts with $ and has specific column order
    if (trimmed.startsWith('$')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 7) {
        const id = parts[0];
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const type = parts[3]; // This is the Type we will color by
        const grid = parts[4];
        const side = parts[5].replace(/[()]/g, '');
        const netId = parts[6];
        
        const remaining = parts.slice(7).join(' ');
        const netNameMatch = remaining.match(/^(.*?)\s+T\s+PIN/);
        const netName = netNameMatch ? netNameMatch[1] : parts[7] || 'N/A';
        const virtualPin = remaining.includes('T PIN') ? remaining.split('T PIN')[1].trim() : '';

        if (!isNaN(x) && !isNaN(y)) {
          nails.push({
            id, x, y, type, grid, side, netId, netName, virtualPin
          });
        }
      }
    }
  });

  if (nails.length === 0) {
    throw new Error('No valid nail data found. Please ensure the file is in Tebo-ICT or compatible .asc format.');
  }

  const minX = Math.min(...nails.map(n => n.x));
  const maxX = Math.max(...nails.map(n => n.x));
  const minY = Math.min(...nails.map(n => n.y));
  const maxY = Math.max(...nails.map(n => n.y));

  return {
    nails,
    metadata: {
      fileName,
      totalNails: nails.length,
      units,
      date
    },
    bounds: { minX, maxX, minY, maxY }
  };
};
