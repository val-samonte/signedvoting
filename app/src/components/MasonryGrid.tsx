'use client';

import { useEffect, useRef, useState } from 'react';

interface MasonryGridProps {
  children: React.ReactNode[];
  gap?: number;
  columns?: number;
}

export function MasonryGrid({ children, gap = 24, columns = 3 }: MasonryGridProps) {
  const [responsiveColumns, setResponsiveColumns] = useState(columns);

  // Handle responsive columns
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setResponsiveColumns(1);
      } else if (width < 1024) {
        setResponsiveColumns(2);
      } else {
        setResponsiveColumns(columns);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [columns]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnHeights, setColumnHeights] = useState<number[]>([]);
  const [items, setItems] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    if (!containerRef.current || children.length === 0) return;

    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const itemWidth = (containerWidth - gap * (responsiveColumns - 1)) / responsiveColumns;
    
    // Reset column heights
    const newColumnHeights = new Array(responsiveColumns).fill(0);
    const newItems: React.ReactNode[] = [];

    // Create a temporary container to measure item heights
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.width = `${itemWidth}px`;
    tempContainer.style.top = '-9999px';
    document.body.appendChild(tempContainer);

    children.forEach((child, index) => {
      // Clone the child element to measure its height
      const tempItem = document.createElement('div');
      tempItem.style.width = `${itemWidth}px`;
      tempItem.innerHTML = (child as any).props?.children || '';
      tempContainer.appendChild(tempItem);

      // Find the shortest column
      const shortestColumnIndex = newColumnHeights.indexOf(Math.min(...newColumnHeights));
      
      // Add the item to the shortest column
      newColumnHeights[shortestColumnIndex] += tempItem.offsetHeight + gap;
      
      // Create the positioned item
      const positionedItem = (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: shortestColumnIndex * (itemWidth + gap),
            top: newColumnHeights[shortestColumnIndex] - tempItem.offsetHeight - gap,
            width: itemWidth,
          }}
        >
          {child}
        </div>
      );
      
      newItems.push(positionedItem);
      tempContainer.removeChild(tempItem);
    });

    document.body.removeChild(tempContainer);
    
    setColumnHeights(newColumnHeights);
    setItems(newItems);
  }, [children, gap, responsiveColumns]);

  const containerHeight = columnHeights.length > 0 
    ? Math.max(...columnHeights.filter(h => isFinite(h) && h >= 0)) 
    : 0;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        height: containerHeight,
      }}
    >
      {items}
    </div>
  );
}
