'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer role="contentinfo" className="mt-auto border-t smooth-appear" style={{ 
      backgroundColor: 'var(--bg-secondary)',
      borderColor: 'var(--border-light)',
      borderTopWidth: '1px',
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
              color: 'var(--text-accent)',
              fontWeight: 'bold',
              marginBottom: '0.5rem'
            }}>
              BookBridge ESL
            </h3>
            <p style={{ 
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              lineHeight: '1.5'
            }}>
              Making great stories accessible to English learners worldwide.
            </p>
          </div>
          
          {/* Product Column */}
          <div style={{
            minWidth: '150px'
          }}>
            <h4 style={{ 
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: '1rem'
            }}>
              Product
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a href="/enhanced-books" style={{ 
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                Enhanced Books
              </a>
              <a href="/ai-tutor" style={{ 
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                AI Tutor
              </a>
              <a href="/pricing" style={{ 
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                Pricing
              </a>
            </div>
          </div>
          
          {/* Support Column */}
          <div style={{
            minWidth: '150px'
          }}>
            <h4 style={{ 
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: '1rem'
            }}>
              Support
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a href="/help" style={{ 
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                Help Center
              </a>
              <a href="/accessibility" style={{ 
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                Accessibility
              </a>
              <a href="/contact" style={{ 
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                Contact
              </a>
            </div>
          </div>
          
          {/* Legal Column */}
          <div style={{
            minWidth: '150px'
          }}>
            <h4 style={{ 
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: '1rem'
            }}>
              Legal
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a href="/privacy" style={{ 
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                Privacy Policy
              </a>
              <a href="/terms" style={{ 
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                Terms of Service
              </a>
            </div>
          </div>
        </div>
        
        
        {/* Copyright */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-light)',
          textAlign: 'center',
          width: '100%'
        }}>
          <p style={{ 
            color: 'var(--text-tertiary)',
            fontSize: '0.875rem'
          }}>
            © 2025 BookBridge. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}