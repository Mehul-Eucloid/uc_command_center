import React from 'react';

const variantClasses = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  destructive: 'bg-red-100 text-red-800',
  outline: 'border border-gray-300',
};

export function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}