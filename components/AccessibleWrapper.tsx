'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface AccessibleComponentProps {
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaLabelledBy?: string;
  ariaLive?: 'polite' | 'assertive' | 'off';
  ariaSetsize?: number;
  ariaPosinset?: number;
  role?: string;
  tabIndex?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
}

interface AccessibleWrapperProps extends AccessibleComponentProps {
  children: React.ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
  style?: React.CSSProperties;
}

export const AccessibleWrapper: React.FC<AccessibleWrapperProps> = ({ 
  children, 
  ariaLabel, 
  ariaDescribedBy,
  ariaLabelledBy,
  ariaLive,
  ariaSetsize,
  ariaPosinset,
  role,
  tabIndex = 0,
  onFocus,
  onBlur,
  className,
  style,
  as: Component = 'div'
}) => {
  const props: any = {
    role,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-labelledby': ariaLabelledBy,
    'aria-live': ariaLive,
    'aria-setsize': ariaSetsize,
    'aria-posinset': ariaPosinset,
    tabIndex,
    onFocus,
    onBlur,
    className: clsx(className),
    style
  };

  // Remove undefined props
  Object.keys(props).forEach(key => {
    if (props[key] === undefined) {
      delete props[key];
    }
  });

  return React.createElement(Component, props, children);
};