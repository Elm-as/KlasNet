import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  overlay?: boolean;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  message, 
  overlay = false,
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const spinnerContent = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <Loader2 className={`${sizeClasses[size]} text-teal-600 animate-spin`} />
      {message && (
        <p className="text-sm text-gray-600 font-medium animate-pulse">
          {message}
        </p>
      )}
    </div>
  );

  if (overlay || fullScreen) {
    return (
      <div className={`${fullScreen ? 'fixed' : 'absolute'} inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90 backdrop-blur-sm`}>
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;
