'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { useAuth } from '@/components/SimpleAuthProvider';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
import MobileNavigationMenu from '@/components/MobileNavigationMenu';
import { useSafeAreaTop } from '@/hooks/useSafeAreaTop';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { isMobile, isMobileMenuOpen, toggleMobileMenu, closeMobileMenu, isClient } = useMobileNavigation();
  const supabase = createClient();
  const safeAreaTop = useSafeAreaTop();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Show some navigation items for all users, with user-specific items when logged in
  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/enhanced-collection', label: 'Enhanced Books' },
    { href: '/featured-books', label: 'Simplified Books' },
    { href: '/library', label: 'Browse All Books' },
    // PILOT PHASE: Feedback collection (Week 1 implementation)
    { href: '/feedback', label: 'Leave Feedback' },
    // PILOT PHASE: Support Us donation link (Donorbox)
    // Mission-driven approach: Focus on feedback collection, voluntary support
    // Future: Will implement paid subscription after product-market fit validation
    { href: 'https://donorbox.org/bookbridge-make-books-accessible-to-everyone-regardless-of-their-their-situation', label: 'Support Us', isPremium: true, isExternal: true },
  ];

  return (
    <>
      <nav className="theme-transition" style={{
        backgroundColor: 'var(--overlay-medium)',
        borderBottom: '2px solid var(--accent-primary)',
        color: 'var(--text-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: 'var(--shadow-soft)',
        // Runtime fallback padding for iOS portrait simulator
        paddingTop: safeAreaTop ? `${safeAreaTop}px` : undefined,
      }}>
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8" style={{ maxWidth: '1200px' }}>
          <div className="flex justify-between items-center h-16" style={{ width: '100%' }}>
            {/* Left side - Logo and Navigation */}
            <div className="flex items-center justify-between w-full" style={{ alignItems: 'center', height: '100%' }}>
              <div className="flex items-center space-x-6">
                {/* Logo */}
                <Link href="/" style={{
                  textDecoration: 'none',
                  outline: 'none',
                  margin: 0,
                  padding: 0,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  lineHeight: '1'
                }} className="flex items-center">
                  <span style={{
                    fontFamily: 'Playfair Display, serif',
                    fontWeight: 800,
                    fontSize: '28px',
                    color: 'var(--text-accent)',
                    letterSpacing: '0.5px',
                    lineHeight: '1'
                  }}>
                    BookBridge
                  </span>
                </Link>
                
                {/* Desktop Navigation Links */}
                <div className="desktop-nav-links items-center" style={{ gap: '30px', display: 'flex' }}>
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      {...((link as any).isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className={`nav-link-styled ${pathname === link.href ? 'nav-link-active' : 'nav-link-inactive'} ${link.isPremium ? 'nav-link-premium' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        ...(link.label === 'Home' ? { padding: '8px 16px', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'visible', lineHeight: 1.2 } : {}),
                        ...(link.label === 'Home' && pathname === '/' ? {
                          background: 'transparent',
                          boxShadow: 'none',
                          color: 'var(--accent-primary)'
                        } : {})
                      }}
                    >
                      {(link as any).icon && React.createElement((link as any).icon, { size: 16 })}
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Mobile Hamburger Menu Button - MOVED TO RIGHT */}
              <button
                onClick={toggleMobileMenu}
                className="mobile-hamburger p-2 rounded-lg transition-colors theme-transition"
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-secondary)';
                  e.currentTarget.style.borderColor = 'var(--accent-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                }}
                aria-label="Toggle mobile menu"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div 
                    style={{
                      width: '24px',
                      height: '3px',
                      background: 'var(--accent-primary)',
                      borderRadius: '2px',
                      transform: isMobileMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  />
                  <div 
                    style={{
                      width: '24px',
                      height: '3px',
                      background: 'var(--accent-primary)',
                      borderRadius: '2px',
                      opacity: isMobileMenuOpen ? 0 : 1,
                      transition: 'all 0.3s ease'
                    }}
                  />
                  <div 
                    style={{
                      width: '24px',
                      height: '3px',
                      background: 'var(--accent-primary)',
                      borderRadius: '2px',
                      transform: isMobileMenuOpen ? 'rotate(-45deg) translate(7px, -6px)' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  />
                </div>
              </button>
            </div>

            {/* Right side - Theme switcher, User menu and Auth buttons */}
            <div className="desktop-user-menu items-center gap-4" style={{ minWidth: 'fit-content', paddingRight: '8px', marginRight: '8px', display: 'flex' }}>
              {/* Theme Switcher */}
              <div className="theme-switcher-nav" style={{ display: 'flex', alignItems: 'center' }}>
                <ThemeSwitcher showLabels={false} size="sm" />
              </div>

              {user ? (
                <>
                  {/* Subscription Status hidden in nav to avoid duplication with Premium CTA */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center text-sm rounded-full focus:outline-none hover-lift-sm theme-transition"
                    style={{
                      background: 'var(--accent-primary)',
                      minWidth: '44px',
                      minHeight: '44px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: 'var(--shadow-soft)',
                      border: '1px solid var(--accent-primary)'
                    }}
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent-secondary)';
                      e.currentTarget.style.boxShadow = '0 6px 12px rgba(205, 127, 50, 0.4)';
                      e.currentTarget.style.borderColor = 'var(--accent-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--accent-primary)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-soft)';
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    }}
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-10 w-10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium" style={{ color: 'var(--bg-primary)' }}>
                        {user.email?.[0].toUpperCase()}
                      </span>
                    </div>
                  </button>

                  {isUserMenuOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 rounded-lg shadow-lg border z-50 smooth-appear theme-transition"
                         style={{
                           backgroundColor: 'var(--bg-secondary)',
                           borderColor: 'var(--border-light)',
                           boxShadow: 'var(--shadow-deep)',
                           backdropFilter: 'blur(20px)',
                           minWidth: '400px',
                           maxWidth: '500px',
                           width: 'max-content'
                         }}>
                      <div className="py-3" role="menu" aria-orientation="vertical">
                        <div className="px-6 py-3" style={{ 
                          color: 'var(--text-primary)',
                          borderBottom: '1px solid var(--border-light)',
                          marginBottom: '8px'
                        }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: 'var(--text-secondary)',
                            marginBottom: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Signed in as</div>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            wordBreak: 'break-word',
                            lineHeight: '1.4',
                            maxWidth: '100%',
                            overflow: 'visible'
                          }} title={user.email}>
                            {user.email}
                          </div>
                        </div>
                        <Link
                          href="/subscription"
                          className="block w-full text-left px-6 py-3 text-sm transition-all duration-300 hover-lift-sm"
                          style={{ 
                            color: '#60a5fa',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ffffff';
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#60a5fa';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <span>⭐</span>
                          <span>Subscription</span>
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="block w-full text-left px-6 py-3 text-sm hover:bg-red-600 hover:bg-opacity-20 transition-all duration-300 hover-lift-sm"
                          style={{ 
                            color: '#ef4444',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          role="menuitem"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ffffff';
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#ef4444';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    href="/auth/login"
                    className="px-4 py-2 text-sm font-medium hover:text-purple-400 transition-all duration-300 whitespace-nowrap hover-lift-sm"
                    style={{ 
                      textDecoration: 'none',
                      color: 'var(--text-secondary)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      borderRadius: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                      e.currentTarget.style.color = 'var(--accent-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="btn btn-brand px-6 py-2 text-sm font-semibold whitespace-nowrap"
                    style={{ textDecoration: 'none' }}
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Mobile Navigation Menu */}
      <MobileNavigationMenu 
        isOpen={isMobileMenuOpen} 
        onClose={closeMobileMenu} 
      />
    </>
  );
}