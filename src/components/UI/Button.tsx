// React import not required with automatic JSX runtime

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-teal-600 text-white hover:bg-teal-700',
  secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-base',
};

export default function Button({ variant = 'primary', className = '', children, leftIcon, rightIcon, size = 'md', ...rest }: ButtonProps) {
  const base = `rounded-md font-medium inline-flex items-center space-x-2 ${sizeClasses[size] || sizeClasses.md}`;
  return (
    <button className={`${base} ${variantClasses[variant]} ${className}`} {...rest}>
      {leftIcon && <span className="inline-flex mr-1">{leftIcon}</span>}
      <span className="inline-flex items-center">{children}</span>
      {rightIcon && <span className="inline-flex ml-1">{rightIcon}</span>}
    </button>
  );
}
