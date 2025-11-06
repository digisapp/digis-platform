'use client';

interface WalletWidgetProps {
  coins: number;
  className?: string;
}

export function WalletWidget({ coins, className = '' }: WalletWidgetProps) {
  return (
    <div className={`glass px-4 py-2 rounded-full flex items-center space-x-2 ${className}`}>
      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-sm">
        🪙
      </div>
      <span className="text-white font-bold">{coins.toLocaleString()}</span>
      <span className="text-gray-400 text-sm">Digis</span>
    </div>
  );
}
