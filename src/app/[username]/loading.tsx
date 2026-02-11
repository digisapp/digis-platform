import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <LoadingSpinner size="lg" label="Loading profile" />
    </div>
  );
}
