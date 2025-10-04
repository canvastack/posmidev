import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

// Updated to use glass utilities and tokens
export const Card: React.FC<CardProps> = ({ children, className }) => (
  <div className={cn('card', className)}>
    {children}
  </div>
);

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => (
  <div className={cn('px-6 py-4 border-b border-white/10', className)}>
    {children}
  </div>
);

export const CardContent: React.FC<CardContentProps> = ({ children, className }) => (
  <div className={cn('relative', className)}>
    {children}
  </div>
);