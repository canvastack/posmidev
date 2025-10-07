import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
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

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

// Updated to use glass utilities and tokens
export const Card: React.FC<CardProps> = ({ children, className, ...props }) => (
  <div className={cn('card', className)} {...props}>
    {children}
  </div>
);

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => (
  <div className={cn('px-6 py-4 border-b border-white/10', className)}>
    {children}
  </div>
);

export const CardTitle: React.FC<CardTitleProps> = ({ children, className }) => (
  <h3 className={cn('text-lg font-semibold text-white', className)}>
    {children}
  </h3>
);

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className }) => (
  <p className={cn('text-sm text-white/60 mt-1', className)}>
    {children}
  </p>
);

export const CardContent: React.FC<CardContentProps> = ({ children, className }) => (
  <div className={cn('relative', className)}>
    {children}
  </div>
);