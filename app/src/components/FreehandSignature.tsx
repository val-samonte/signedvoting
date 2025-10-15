'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { getStroke } from 'perfect-freehand';

interface FreehandSignatureProps {
  width?: number;
  height?: number;
  value?: number[][]; // The points array
  onChange?: (points: number[][]) => void; // Called when points change
}

export function FreehandSignature({ 
  width = 300, 
  height = 200, 
  value = [],
  onChange
}: FreehandSignatureProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Use the controlled value prop
  const points = value;

  const getSvgPathFromStroke = useCallback((stroke: number[][]) => {
    if (stroke.length < 4) {
      return '';
    }

    const average = (a: number, b: number) => (a + b) / 2;

    let a = stroke[0];
    let b = stroke[1];
    const c = stroke[2];

    let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`;

    for (let i = 2, max = stroke.length - 1; i < max; i++) {
      a = stroke[i];
      b = stroke[i + 1];
      result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `;
    }

    result += 'Z';
    return result;
  }, []);

  const generateSvgString = useCallback((pathData: string) => {
    if (!pathData) return '';
    
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <path d="${pathData}" fill="black" stroke="black" stroke-width="1"/>
    </svg>`;
  }, [width, height]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onChange?.([[x, y, 0.5]]);
    setIsDrawing(true);
  }, [onChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onChange?.([...points, [x, y, 0.5]]);
  }, [isDrawing, points, onChange]);

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const stroke = getStroke(points, {
    size: 4,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: true,
    last: true,
  });

  const pathData = getSvgPathFromStroke(stroke);

  return (
    <div className="flex flex-col items-center space-y-3">
      <p className="text-sm font-medium text-gray-700">Sign below:</p>
      
      <div className="relative border-2 border-gray-300 rounded-lg bg-white">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="block cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          {pathData && (
            <path
              d={pathData}
              fill="black"
              stroke="black"
              strokeWidth="1"
            />
          )}
        </svg>
        
        {points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 text-sm">Draw your signature here</p>
          </div>
        )}
      </div>
    </div>
  );
}
