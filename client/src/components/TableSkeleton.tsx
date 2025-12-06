interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export default function TableSkeleton({ rows = 3, columns = 5 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-green-900/30">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-3 md:px-6 py-3 md:py-4">
              <div className="space-y-2">
                {/* Main skeleton bar */}
                <div className="h-4 bg-green-900/30 rounded animate-pulse" style={{
                  width: colIndex === 0 ? '80%' : colIndex === columns - 1 ? '60%' : '90%'
                }} />
                {/* Secondary skeleton bar (only in first column for variety) */}
                {colIndex === 0 && (
                  <div className="h-3 bg-green-900/20 rounded animate-pulse w-1/2" />
                )}
              </div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
