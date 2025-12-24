
export interface NailData {
  id: string;
  x: number;
  y: number;
  type: string;
  grid: string;
  side: string;
  netId: string;
  netName: string;
  virtualPin: string;
}

export interface ParseResult {
  nails: NailData[];
  metadata: {
    fileName: string;
    totalNails: number;
    units: string;
    date?: string;
  };
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}
