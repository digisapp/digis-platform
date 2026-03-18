import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ConversationLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <LoadingSpinner size="lg" label="Loading conversation" />
    </div>
  );
}
