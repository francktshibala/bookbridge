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
    { href: '/enhanced-collection', label: '✨ Enhanced Books' },
    { href: '/library', label: 'Browse All Books' },
    // TOUCHPOINT 1: Premium navigation link
    { href: '/upgrade', label: '🚀 Premium $5.99', isPremium: true },
  ];

  return (
    <>
      <nav style={{ 
        backgroundColor: '#1a1a2e', 
        borderBottom: '1px solid rgba(102, 126, 234, 0.2)', 
        color: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(102, 126, 234, 0.1)',
        // Runtime fallback padding for iOS portrait simulator
        paddingTop: safeAreaTop ? `${safeAreaTop}px` : undefined,
      }} className="safe-area-top">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8" style={{ maxWidth: 'none' }}>
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
                  <span className="text-gradient" style={{ 
                    fontSize: '24px', 
                    margin: 0, 
                    padding: 0,
                    lineHeight: '1'
                  }}>
                    BookBridge ESL
                  </span>
                </Link>
                
                {/* Desktop Navigation Links */}
                <div className="desktop-nav-links items-center space-x-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`nav-link-styled ${
                        pathname === link.href
                          ? 'nav-link-active'
                          : 'nav-link-inactive'
                      }`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        // Special styling for premium link
                        ...(link.isPremium && {
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          fontWeight: '600',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                        })
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
                className="mobile-hamburger p-2 rounded-lg hover:bg-gray-700 hover:bg-opacity-30 transition-colors"
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label="Toggle mobile menu"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div 
                    style={{
                      width: '24px',
                      height: '3px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '2px',
                      transform: isMobileMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  />
                  <div 
                    style={{
                      width: '24px',
                      height: '3px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '2px',
                      opacity: isMobileMenuOpen ? 0 : 1,
                      transition: 'all 0.3s ease'
                    }}
                  />
                  <div 
                    style={{
                      width: '24px',
                      height: '3px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '2px',
                      transform: isMobileMenuOpen ? 'rotate(-45deg) translate(7px, -6px)' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  />
                </div>
              </button>
            </div>

            {/* Right side - User menu and Auth buttons */}
            <div className="desktop-user-menu items-center" style={{ minWidth: 'fit-content', paddingRight: '40px', marginRight: '24px' }}>
              {user ? (
                <>
                  {/* Subscription Status */}
                  <div className="mr-6">
                    <SubscriptionStatus />
                  </div>
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 hover-lift-sm"
                    style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      minWidth: '44px',
                      minHeight: '44px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 8px rgba(102, 126, 234, 0.3)'
                    }}
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #7c8ef8 0%, #8b5fd6 100%)';
                      e.currentTarget.style.boxShadow = '0 6px 12px rgba(102, 126, 234, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)';
                    }}
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-10 w-10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user.email?.[0].toUpperCase()}
                      </span>
                    </div>
                  </button>

                  {isUserMenuOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 rounded-lg shadow-lg border z-50 smooth-appear"
                         style={{
                           backgroundColor: 'rgba(26, 26, 46, 0.95)',
                           borderColor: 'rgba(102, 126, 234, 0.2)',
                           boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(102, 126, 234, 0.2)',
                           backdropFilter: 'blur(20px)',
                           minWidth: '400px',
                           maxWidth: '500px',
                           width: 'max-content'
                         }}>
                      <div className="py-3" role="menu" aria-orientation="vertical">
                        <div className="px-6 py-3" style={{ 
                          color: '#f7fafc',
                          borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
                          marginBottom: '8px'
                        }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#a5b4fc',
                            marginBottom: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Signed in as</div>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#f7fafc',
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
                      color: '#e2e8f0',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      borderRadius: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                      e.currentTarget.style.color = '#7c8ef8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#e2e8f0';
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