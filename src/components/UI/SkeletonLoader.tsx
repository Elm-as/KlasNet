import React from 'react';
import clsx from 'clsx';

interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'table';
  width?: string | number;
  height?: string | number;
  rows?: number;
  className?: string;
}

/**
 * Composant Skeleton pour afficher des placeholders pendant le chargement
 * Améliore l'expérience utilisateur en montrant la structure future du contenu
 */
export default function SkeletonLoader({
  variant = 'rectangular',
  width,
  height,
  rows = 1,
  className,
}: SkeletonLoaderProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';

  if (variant === 'table') {
    return (
      <div className={clsx('space-y-2', className)}>
        {/* Header */}
        <div className="flex space-x-2 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={clsx(baseClasses, 'h-10 rounded flex-1')}
            />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex space-x-2">
            {Array.from({ length: 5 }).map((_, j) => (
              <div
                key={j}
                className={clsx(baseClasses, 'h-12 rounded flex-1')}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={clsx('space-y-2', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={clsx(baseClasses, 'h-4 rounded')}
            style={{
              width: width || (i === rows - 1 ? '80%' : '100%'),
              height: height || '1rem',
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circular') {
    return (
      <div
        className={clsx(baseClasses, 'rounded-full', className)}
        style={{
          width: width || '3rem',
          height: height || width || '3rem',
        }}
      />
    );
  }

  // rectangular (default)
  return (
    <div
      className={clsx(baseClasses, 'rounded', className)}
      style={{
        width: width || '100%',
        height: height || '4rem',
      }}
    />
  );
}

/**
 * Composant spécialisé pour table de données
 */
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex space-x-2">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-300 dark:bg-gray-600 h-10 rounded flex-1"
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-2">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="animate-pulse bg-gray-200 dark:bg-gray-700 h-12 rounded flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Composant pour skeleton de cards de statistiques
 */
export function StatCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-gray-200 dark:bg-gray-700 h-24 rounded-lg"
        />
      ))}
    </div>
  );
}
