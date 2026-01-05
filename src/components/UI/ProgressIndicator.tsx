import React from 'react';
import clsx from 'clsx';

interface ProgressIndicatorProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'gray';
  className?: string;
  label?: string;
}

/**
 * Composant de barre de progression réutilisable
 * Utilisé pour afficher la progression des imports, exports, et états de paiement
 */
export default function ProgressIndicator({
  value,
  size = 'md',
  showLabel = false,
  color = 'blue',
  className,
  label,
}: ProgressIndicatorProps) {
  const normalizedValue = Math.min(Math.max(value, 0), 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    orange: 'bg-orange-500',
    red: 'bg-red-600',
    gray: 'bg-gray-400',
  };

  return (
    <div className={clsx('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm text-gray-700">{label}</span>}
          {showLabel && (
            <span className="text-sm font-medium text-gray-900">
              {normalizedValue.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className={clsx('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={clsx('h-full transition-all duration-300 ease-out rounded-full', colorClasses[color])}
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Composant de progression circulaire
 */
export function CircularProgress({
  value,
  size = 60,
  strokeWidth = 4,
  color = 'blue',
  showLabel = true,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: 'blue' | 'green' | 'orange' | 'red';
  showLabel?: boolean;
  className?: string;
}) {
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedValue / 100) * circumference;

  const colorMap = {
    blue: '#2563eb',
    green: '#16a34a',
    orange: '#ea580c',
    red: '#dc2626',
  };

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colorMap[color]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      {showLabel && (
        <span className="absolute text-sm font-semibold text-gray-900">
          {normalizedValue.toFixed(0)}%
        </span>
      )}
    </div>
  );
}

/**
 * Composant de progression avec étapes
 */
export function StepProgress({
  steps,
  currentStep,
  className,
}: {
  steps: string[];
  currentStep: number;
  className?: string;
}) {
  return (
    <div className={clsx('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    {
                      'bg-green-600 text-white': isCompleted,
                      'bg-blue-600 text-white': isCurrent,
                      'bg-gray-200 text-gray-500': isUpcoming,
                    }
                  )}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span
                  className={clsx('mt-2 text-xs text-center', {
                    'text-gray-900 font-medium': isCurrent,
                    'text-gray-600': !isCurrent,
                  })}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={clsx('flex-1 h-0.5 mx-2 -mt-8', {
                    'bg-green-600': isCompleted,
                    'bg-gray-200': !isCompleted,
                  })}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
