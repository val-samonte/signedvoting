'use client';

interface MasonryGridProps {
  children: React.ReactNode[];
}

export function MasonryGrid({ children  }: MasonryGridProps) {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3 lg:gap-5 lg:space-y-4">
      {children.map((child, index) => (
        <div key={index} className="break-inside-avoid">
          {child}
        </div>
      ))}
    </div>
  );
}
