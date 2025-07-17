'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface AccessibleComponentProps {
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaLabelledBy?: string;
  role?: string;
  tabIndex?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
}

interface AccessibleWrapperProps extends AccessibleComponentProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

export const AccessibleWrapper: React.FC<AccessibleWrapperProps> = ({ 
  children, 
  ariaLabel, 
  ariaDescribedBy,
  ariaLabelledBy,
  role,
  tabIndex = 0,
  onFocus,
  onBlur,
  className,
  as: Component = 'div'
}) => {
  const props: any = {
    role,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-labelledby': ariaLabelledBy,
    tabIndex,
    onFocus,
    onBlur,
    className: clsx(className)
  };

  // Remove undefined props
  Object.keys(props).forEach(key => {
    if (props[key] === undefined) {
      delete props[key];
    }
  });

  return React.createElement(Component, props, children);
};