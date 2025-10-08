import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
}

export default function ProgressBar({
  progress,
  color = 'bg-blue-500',
  size = 'md',
  showPercentage = false,
  className = ''
}: ProgressBarProps) {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]} ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${clampedProgress}%` }}
      />
      {showPercentage && (
        <div className="text-xs text-gray-600 mt-1 text-center">
          {Math.round(clampedProgress)}%
        </div>
      )}
    </div>
  );
}
