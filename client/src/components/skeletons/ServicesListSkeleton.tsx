import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ServicesListSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between">
                <Skeleton className="h-10 w-10 rounded" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-9 w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
