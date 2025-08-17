'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer role="contentinfo" className="mt-auto border-t smooth-appear" style={{ 
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      borderColor: '#334155',
      borderTopWidth: '1px',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      position: 'relative',
      overflow: 'hidden',
      width: '100%'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: '3rem',
          flexWrap: 'wrap',
          textAlign: 'center'
        }}>
          {/* Brand Column */}
          <div style={{
            flex: '1',
            minWidth: '200px',
            maxWidth: '300px'
          }}>
            <h3 style={{ 
              fontSize: '1.25rem',
              color: '#ffffff',
              fontWeight: 'bold',
              marginBottom: '0.5rem'
            }}>
              BookBridge ESL
            </h3>
            <p style={{ 
              color: '#94a3b8',
              fontSize: '0.875rem',
              lineHeight: '1.5'
            }}>
              Making classic literature accessible to English learners worldwide.
            </p>
          </div>
          
          {/* Product Column */}
          <div style={{
            minWidth: '150px'
          }}>
            <h4 style={{ 
              color: '#e2e8f0',
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: '1rem'
            }}>
              Product
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a href="/enhanced-books" style={{ 
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
                Enhanced Books
              </a>
              <a href="/ai-tutor" style={{ 
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
                AI Tutor
              </a>
              <a href="/pricing" style={{ 
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
                Pricing
              </a>
            </div>
          </div>
          
          {/* Support Column */}
          <div style={{
            minWidth: '150px'
          }}>
            <h4 style={{ 
              color: '#e2e8f0',
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: '1rem'
            }}>
              Support
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a href="/help" style={{ 
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
                Help Center
              </a>
              <a href="/accessibility" style={{ 
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
                Accessibility
              </a>
              <a href="/contact" style={{ 
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
                Contact
              </a>
            </div>
          </div>
          
          {/* Legal Column */}
          <div style={{
            minWidth: '150px'
          }}>
            <h4 style={{ 
              color: '#e2e8f0',
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: '1rem'
            }}>
              Legal
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a href="/privacy" style={{ 
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
                Privacy Policy
              </a>
              <a href="/terms" style={{ 
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
                Terms of Service
              </a>
            </div>
          </div>
        </div>
        
        
        {/* Copyright */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid #374151',
          textAlign: 'center',
          width: '100%'
        }}>
          <p style={{ 
            color: '#64748b',
            fontSize: '0.875rem'
          }}>
            © 2025 BookBridge. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}