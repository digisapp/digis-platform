import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ExploreLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <LoadingSpinner size="lg" label="Loading explore" />
    </div>
  );
}
