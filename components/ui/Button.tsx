import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none";
  
  // Premium Color Palette: Stone / Charcoal / Warm Gray
  const variants = {
    primary: "bg-stone-800 text-stone-50 hover:bg-stone-900 focus:ring-stone-600 shadow-md hover:shadow-lg",
    secondary: "bg-stone-100 text-stone-800 hover:bg-stone-200 focus:ring-stone-400",
    outline: "border border-stone-300 hover:bg-stone-50 text-stone-600",
    danger: "bg-red-700 text-white hover:bg-red-800 focus:ring-red-500",
  };

  const sizes = {
    sm: "h-9 px-4 text-xs tracking-wide",
    md: "h-11 px-6 text-sm tracking-wide",
    lg: "h-14 px-8 text-base", 
    xl: "h-16 px-10 text-lg font-serif",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
};