'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer role="contentinfo" className="mt-auto border-t smooth-appear" style={{ 
      backgroundColor: 'rgba(26, 26, 46, 0.85)',
      borderColor: 'rgba(102, 126, 234, 0.2)',
      borderTopWidth: '1px',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 -1px 3px rgba(102, 126, 234, 0.1), inset 0 1px 0 rgba(102, 126, 234, 0.1)'
    }}>
      {/* Subtle gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.05) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />
      
      <div className="w-full max-w-7xl mx-auto px-8 lg:px-12 py-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-20 mb-16" style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'
        }}>
          {/* Brand Column */}
          <div className="space-y-5 min-w-0 pb-8 md:pb-0 border-b md:border-b-0 border-gray-600/20">
            <h3 className="font-bold text-gradient mb-6" style={{ 
              fontSize: 'var(--text-3xl)',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em',
              marginRight: '2rem'
            }}>
              BookBridge
            </h3>
            <p style={{ 
              color: '#a5b4fc',
              fontSize: 'var(--text-base)',
              lineHeight: '1.7',
              marginBottom: '1.5rem',
              marginRight: '2rem'
            }}>
              AI-powered reading companion built with accessibility first. Making knowledge accessible to everyone.
            </p>
            <p className="font-medium" style={{ 
              color: '#e2e8f0',
              fontSize: 'var(--text-sm)',
              opacity: 0.9,
              marginRight: '2rem'
            }}>
              © 2025 BookBridge
            </p>
          </div>
          
          {/* Features Column */}
          <div className="space-y-4 min-w-0 pb-8 md:pb-0 border-b md:border-b-0 border-gray-600/20">
            <h4 className="font-semibold mb-6" style={{ 
              color: '#f7fafc',
              fontSize: 'var(--text-xl)',
              letterSpacing: '-0.01em',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid rgba(102, 126, 234, 0.1)'
            }}>
              Features
            </h4>
            <div className="space-y-3">
              <a href="/library" className="block transition-all duration-300 hover:translate-x-1 hover:text-purple-400" style={{ 
                color: '#a5b4fc',
                textDecoration: 'none',
                fontSize: 'var(--text-base)',
                padding: '0.25rem 0'
              }}>
                Book Library
              </a>
              <a href="/upload" className="block transition-all duration-300 hover:translate-x-1 hover:text-purple-400" style={{ 
                color: '#a5b4fc',
                textDecoration: 'none',
                fontSize: 'var(--text-base)',
                padding: '0.25rem 0'
              }}>
                Upload Books
              </a>
              <a href="/knowledge-graph" className="block transition-all duration-300 hover:translate-x-1 hover:text-purple-400" style={{ 
                color: '#a5b4fc',
                textDecoration: 'none',
                fontSize: 'var(--text-base)',
                padding: '0.25rem 0'
              }}>
                Knowledge Graph
              </a>
            </div>
          </div>
          
          {/* Resources Column */}
          <div className="space-y-4 min-w-0 pb-8 md:pb-0 border-b md:border-b-0 border-gray-600/20">
            <h4 className="font-semibold mb-6" style={{ 
              color: '#f7fafc',
              fontSize: 'var(--text-xl)',
              letterSpacing: '-0.01em',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid rgba(102, 126, 234, 0.1)'
            }}>
              Resources
            </h4>
            <div className="space-y-3">
              <a href="/accessibility" className="block transition-all duration-300 hover:translate-x-1 hover:text-purple-400" style={{ 
                color: '#a5b4fc',
                textDecoration: 'none',
                fontSize: 'var(--text-base)',
                padding: '0.25rem 0'
              }}>
                Accessibility
              </a>
              <a href="/privacy" className="block transition-all duration-300 hover:translate-x-1 hover:text-purple-400" style={{ 
                color: '#a5b4fc',
                textDecoration: 'none',
                fontSize: 'var(--text-base)',
                padding: '0.25rem 0'
              }}>
                Privacy Policy
              </a>
              <a href="/terms" className="block transition-all duration-300 hover:translate-x-1 hover:text-purple-400" style={{ 
                color: '#a5b4fc',
                textDecoration: 'none',
                fontSize: 'var(--text-base)',
                padding: '0.25rem 0'
              }}>
                Terms of Service
              </a>
            </div>
          </div>
          
          {/* Connect Column */}
          <div className="space-y-4 min-w-0">
            <h4 className="font-semibold mb-6" style={{ 
              color: '#f7fafc',
              fontSize: 'var(--text-xl)',
              letterSpacing: '-0.01em',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid rgba(102, 126, 234, 0.1)'
            }}>
              Connect
            </h4>
            <div className="flex gap-4 mt-2">
              {/* Social Links */}
              <a 
                href="#" 
                className="social-link transition-all duration-300 hover:scale-110 hover:-translate-y-0.5"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  color: '#a5b4fc',
                  fontSize: '24px'
                }}
              >
                𝕏
              </a>
              <a 
                href="#" 
                className="social-link transition-all duration-300 hover:scale-110 hover:-translate-y-0.5"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  color: '#a5b4fc',
                  fontSize: '20px',
                  fontWeight: '600'
                }}
              >
                in
              </a>
            </div>
          </div>
        </div>
        
        {/* Legal Disclaimer - Compact glassmorphism style */}
        <div className="mt-12 p-8 rounded-2xl smooth-appear" style={{ 
          backgroundColor: 'rgba(51, 65, 85, 0.2)',
          border: '1px solid rgba(102, 126, 234, 0.1)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle inner glow */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 50% 0%, rgba(102, 126, 234, 0.03) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <p className="text-center relative z-10" style={{ 
            color: '#a5b4fc',
            fontSize: 'var(--text-sm)',
            lineHeight: '1.6',
            maxWidth: '900px',
            margin: '0 auto',
            opacity: 0.85
          }}>
            AI analysis based on training knowledge. BookBridge does not store copyrighted content. 
            All analyses represent educational commentary and fair use discussion.
          </p>
        </div>
      </div>
      
      <style jsx>{`
        .social-link:hover {
          background-color: rgba(102, 126, 234, 0.2) !important;
          border-color: rgba(102, 126, 234, 0.4) !important;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        a:hover {
          color: #667eea !important;
        }
      `}</style>
    </footer>
  );
}