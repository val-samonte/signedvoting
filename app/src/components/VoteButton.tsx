'use client';

interface VoteButtonProps {
  disabled: boolean;
  onClick?: () => void;
}

export function VoteButton({ disabled, onClick }: VoteButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-8 py-3 bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
    >
      Vote Now
    </button>
  );
}
