'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { useAuth } from '@/components/SimpleAuthProvider';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';

interface MobileNavigationMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNavigationMenu({ isOpen, onClose }: MobileNavigationMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onClose();
    router.push('/');
  };

  const handleNavClick = () => {
    onClose();
  };

  const navigationItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/catalog', label: '📚 Library', icon: '📚' },
    { href: '/enhanced-collection', label: '✨ Enhanced Books', icon: '✨' },
    // Note: 'Browse All Books' (/library) disabled per catalog unification plan
    { href: '/feedback', label: '💬 Leave Feedback', icon: '💬' },
    { href: 'https://donorbox.org/bookbridge-make-books-accessible-to-everyone-regardless-of-their-their-situation', label: 'Support Us', icon: '❤️', isPremium: true, isExternal: true },
  ];

  // Hide on desktop screens even if isOpen is true
  if (!isOpen) return null;
  
  // Additional check: hide on desktop screens
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="mobile-nav-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: '9998',
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
      />
      
      {/* Slide-out Menu */}
      <div
        className="mobile-nav-menu bg-[var(--bg-primary)] text-[var(--text-primary)]"
        style={{
          position: 'fixed',
          top: '0',
          right: '0',
          height: '100vh',
          width: '320px',
          zIndex: '9999',
          backdropFilter: 'blur(20px)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-light)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px' }}>
          {/* Header with Close Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingTop: '16px' }}>
            <h2 className="text-[var(--text-primary)] text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '24px',
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Close menu"
            >
              ×
            </button>
          </div>


          {/* Navigation Links */}
          <nav style={{ flex: '1' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {navigationItems.length > 0 ? (
                navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    {...((item as any).isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={`nav-link-styled ${
                      pathname === item.href
                        ? 'nav-link-active'
                        : 'nav-link-inactive'
                    } ${item.isPremium ? 'premium-nav-link' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      minHeight: '56px',
                      margin: '0',
                      ...(item.isPremium ? {
                        background: 'var(--accent-primary)',
                        color: 'var(--bg-primary)',
                        borderRadius: '12px',
                        fontWeight: '600',
                        marginTop: '8px'
                      } : {})
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{item.icon}</span>
                    {item.label}
                  </Link>
                ))
              ) : null}

              {/* Theme Switcher - Mobile Only */}
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-light)' }}>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    fontWeight: '600',
                    fontFamily: 'Playfair Display, serif'
                  }}>
                    Reading Theme
                  </span>
                </div>
                <ThemeSwitcher showLabels={false} size="sm" className="mobile-theme-switcher" />
              </div>

              {/* Show Sign In/Sign Up for guest users */}
              {!user && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
                  <Link
                    href="/auth/login"
                    onClick={handleNavClick}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: '500',
                      minHeight: '56px',
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--bg-primary)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--accent-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                    }}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={handleNavClick}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: '500',
                      minHeight: '56px',
                      backgroundColor: 'transparent',
                      color: 'var(--accent-primary)',
                      border: '1px solid var(--border-light)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--accent-primary)';
                    }}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Bottom Section - User Info and Sign Out */}
          {user && (
            <div style={{
              marginTop: 'auto',
              paddingTop: '20px',
              borderTop: '1px solid var(--border-light)'
            }}>
              {/* User Profile Section */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'Source Serif Pro, serif',
                  marginBottom: '4px'
                }}>
                  Signed in as
                </div>
                <div style={{
                  fontSize: '16px',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  fontFamily: 'Source Serif Pro, serif',
                  wordBreak: 'break-all'
                }}>
                  {user.email}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: '500',
                  minHeight: '56px',
                  backgroundColor: 'transparent',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#ef4444';
                }}
              >
                <span style={{ fontSize: '18px', marginRight: '12px' }}>🚪</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}