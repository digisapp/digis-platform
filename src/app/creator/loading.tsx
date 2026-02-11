import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function CreatorLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <LoadingSpinner size="lg" label="Loading creator dashboard" />
    </div>
  );
}
