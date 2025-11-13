/**
 * Dashboard skeleton loader
 * Shows instantly while data loads to prevent blank screens
 */

export function SkeletonDashboard() {
  return (
    <div className="min-h-screen bg-pastel-gradient">
      <div className="container mx-auto px-4 pt-0 md:pt-4 pb-20 md:pb-8">
        {/* Mobile Wallet Widget Skeleton */}
        <div className="md:hidden mb-4">
          <div className="glass rounded-2xl border-2 border-purple-200 p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 bg-gray-300 rounded"></div>
              <div className="h-5 w-16 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>

        <div className="px-4">
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass rounded-2xl border border-purple-200 p-6 shadow-fun animate-pulse"
              >
                <div className="h-4 w-24 bg-gray-300 rounded mb-3"></div>
                <div className="h-8 w-32 bg-gray-300 rounded mb-2"></div>
                <div className="h-3 w-16 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>

          {/* Large Card Skeleton */}
          <div className="glass rounded-2xl border border-purple-200 p-6 shadow-fun mb-8 animate-pulse">
            <div className="h-6 w-48 bg-gray-300 rounded mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 w-48 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 w-32 bg-gray-300 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="glass rounded-2xl border border-purple-200 p-6 shadow-fun animate-pulse"
              >
                <div className="h-6 w-32 bg-gray-300 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 w-full bg-gray-300 rounded"></div>
                  <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
