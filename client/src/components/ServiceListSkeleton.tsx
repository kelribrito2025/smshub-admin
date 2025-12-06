interface ServiceListSkeletonProps {
  count?: number;
}

export default function ServiceListSkeleton({ count = 8 }: ServiceListSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-gray-900 border border-green-900/50 rounded p-3">
          <div className="flex items-center gap-3">
            {/* Icon skeleton */}
            <div className="w-8 h-8 bg-green-900/30 rounded animate-pulse flex-shrink-0" />
            
            {/* Content skeleton */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Service name */}
              <div className="h-4 bg-green-900/30 rounded animate-pulse" style={{
                width: `${60 + Math.random() * 30}%` // Random width between 60-90%
              }} />
              
              {/* Price */}
              <div className="h-3 bg-green-900/20 rounded animate-pulse w-24" />
            </div>

            {/* Chevron skeleton */}
            <div className="w-5 h-5 bg-green-900/30 rounded animate-pulse flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
