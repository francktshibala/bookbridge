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
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        width: '100%',
        maxWidth: '320px',
        height: '380px'
      }}
    >
      {/* Header skeleton */}
      <div style={{
        height: '120px',
        background: 'linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite'
      }} />
      
      {/* Content skeleton */}
      <div style={{ padding: '20px' }}>
        {/* Title skeleton */}
        <div style={{
          height: '24px',
          background: 'linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
          borderRadius: '4px',
          marginBottom: '12px'
        }} />
        
        {/* Author skeleton */}
        <div style={{
          height: '16px',
          width: '60%',
          background: 'linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)',
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
            background: 'linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
            borderRadius: '6px'
          }} />
          <div style={{
            height: '24px',
            width: '80px',
            background: 'linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
            borderRadius: '6px'
          }} />
        </div>
        
        {/* Button skeleton */}
        <div style={{
          height: '44px',
          background: 'linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)',
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