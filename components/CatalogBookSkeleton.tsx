'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function CatalogBookSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ 
        delay: index * 0.05,
        duration: 0.3
      }}
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15), 0 10px 25px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        border: '1px solid var(--border-light)',
        width: '100%',
        maxWidth: '350px',
        aspectRatio: '1',
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* Header skeleton */}
      <div style={{
        height: '140px',
        background: 'linear-gradient(90deg, var(--surface-subtle) 0%, var(--border-subtle) 50%, var(--surface-subtle) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite'
      }} />
      
      {/* Content skeleton */}
      <div style={{ 
        padding: '20px',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Title skeleton */}
        <div style={{
          height: '24px',
          background: 'linear-gradient(90deg, var(--surface-subtle) 0%, var(--border-subtle) 50%, var(--surface-subtle) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
          borderRadius: '4px',
          marginBottom: '12px'
        }} />
        
        {/* Author skeleton */}
        <div style={{
          height: '16px',
          width: '60%',
          background: 'linear-gradient(90deg, var(--surface-subtle) 0%, var(--border-subtle) 50%, var(--surface-subtle) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
          borderRadius: '4px',
          marginBottom: '20px'
        }} />
        
        {/* Tags skeleton */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <div style={{
            height: '24px',
            width: '50px',
            background: 'linear-gradient(90deg, var(--surface-subtle) 0%, var(--border-subtle) 50%, var(--surface-subtle) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
            borderRadius: '6px'
          }} />
          <div style={{
            height: '24px',
            width: '80px',
            background: 'linear-gradient(90deg, var(--surface-subtle) 0%, var(--border-subtle) 50%, var(--surface-subtle) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
            borderRadius: '6px'
          }} />
        </div>
        
        {/* Button skeleton */}
        <div style={{
          height: '44px',
          background: 'linear-gradient(90deg, var(--surface-subtle) 0%, var(--border-subtle) 50%, var(--surface-subtle) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
          borderRadius: '12px',
          marginTop: 'auto'
        }} />
      </div>
      
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </motion.div>
  );
}